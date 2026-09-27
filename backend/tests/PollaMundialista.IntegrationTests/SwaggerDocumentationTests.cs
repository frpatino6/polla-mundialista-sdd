using System.Net;
using System.Text.Json;

namespace PollaMundialista.IntegrationTests;

public class SwaggerDocumentationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SwaggerDocumentationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SwaggerJson_ReturnsOkWithValidOpenApiDocument()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(content);

        Assert.True(document.RootElement.TryGetProperty("paths", out _));
    }

    [Theory]
    [InlineData("/api/auth/register")]
    [InlineData("/api/auth/login")]
    [InlineData("/api/matches")]
    [InlineData("/api/predictions")]
    [InlineData("/api/predictions/me")]
    [InlineData("/api/predictions/user/{userId}")]
    [InlineData("/api/admin/matches/{matchId}/result")]
    [InlineData("/api/leaderboard")]
    public async Task SwaggerJson_ContainsAllContractRoutes(string expectedPath)
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(content);

        var paths = document.RootElement.GetProperty("paths");

        Assert.True(paths.TryGetProperty(expectedPath, out _),
            $"Se esperaba la ruta '{expectedPath}' en el documento OpenAPI generado.");
    }

    [Fact]
    public async Task SwaggerJson_DeclaresBearerHttpSecurityScheme()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(content);

        var securitySchemes = document.RootElement
            .GetProperty("components")
            .GetProperty("securitySchemes");

        Assert.True(securitySchemes.TryGetProperty("Bearer", out var bearerScheme),
            "Se esperaba un esquema de seguridad 'Bearer' bajo components.securitySchemes.");

        Assert.Equal("http", bearerScheme.GetProperty("type").GetString());
        Assert.Equal("bearer", bearerScheme.GetProperty("scheme").GetString());
    }
}
