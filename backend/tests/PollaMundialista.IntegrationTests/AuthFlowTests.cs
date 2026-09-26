using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using PollaMundialista.Api.Controllers;

namespace PollaMundialista.IntegrationTests;

public class AuthFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthFlowTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RegisterAndLogin_ReturnsValidJwt()
    {
        var client = _factory.CreateClient();
        var email = $"jwt-{Guid.NewGuid():N}@test.com";
        const string password = "Password123";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var loginResult = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
        var token = loginResult.GetProperty("token").GetString();

        Assert.False(string.IsNullOrWhiteSpace(token));

        var segments = token!.Split('.');
        Assert.Equal(3, segments.Length);

        var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(segments[1]));
        using var payload = JsonDocument.Parse(payloadJson);
        var emailClaim = payload.RootElement.GetProperty("email").GetString();

        Assert.Equal(email, emailClaim);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/leaderboard");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_WithUserRole_Returns403()
    {
        var client = _factory.CreateClient();
        var (_, token) = await TestAuthHelper.RegisterAndLoginAsync(client, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(client, token);

        var response = await client.PutAsJsonAsync($"/api/admin/matches/{Guid.NewGuid()}/result",
            new MatchResultRequest(HomeScore: 1, AwayScore: 0));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var base64 = input.Replace('-', '+').Replace('_', '/');
        switch (base64.Length % 4)
        {
            case 2: base64 += "=="; break;
            case 3: base64 += "="; break;
        }

        return Convert.FromBase64String(base64);
    }
}
