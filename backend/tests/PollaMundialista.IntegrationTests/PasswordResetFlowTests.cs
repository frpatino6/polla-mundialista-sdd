using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PollaMundialista.Api.Controllers;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Infrastructure.Persistence;

namespace PollaMundialista.IntegrationTests;

public class PasswordResetFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public PasswordResetFlowTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ForgotPassword_ExistingEmail_And_NonExistingEmail_ReturnIndistinguishableResponses()
    {
        var client = _factory.CreateClient();
        var existingEmail = $"forgot-{Guid.NewGuid():N}@test.com";
        await TestAuthHelper.RegisterAndLoginAsync(client, existingEmail, "Password123");

        var existingResponse = await client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(existingEmail));
        var missingEmail = $"noexiste-{Guid.NewGuid():N}@test.com";
        var missingResponse = await client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(missingEmail));

        Assert.Equal(existingResponse.StatusCode, missingResponse.StatusCode);

        var existingBody = await existingResponse.Content.ReadAsStringAsync();
        var missingBody = await missingResponse.Content.ReadAsStringAsync();
        Assert.Equal(existingBody, missingBody);
    }

    [Fact]
    public async Task ResetPassword_ExpiredToken_Returns400WithDomainMessage()
    {
        var client = _factory.CreateClient();
        const string rawToken = "expired-raw-token";
        await SeedPasswordResetTokenAsync(
            $"expired-{Guid.NewGuid():N}@test.com", "Password123", rawToken, DateTimeOffset.UtcNow.AddHours(-2));

        var response = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(rawToken, "NewPassword123"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("expiró", body);
    }

    [Fact]
    public async Task ResetPassword_AlreadyConsumedToken_Returns400WithDomainMessage()
    {
        var client = _factory.CreateClient();
        const string rawToken = "consumed-raw-token";
        await SeedPasswordResetTokenAsync(
            $"consumed-{Guid.NewGuid():N}@test.com", "Password123", rawToken, DateTimeOffset.UtcNow.AddHours(1));

        var firstResponse = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(rawToken, "NewPassword123"));
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        var secondResponse = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(rawToken, "AnotherPassword456"));

        Assert.Equal(HttpStatusCode.BadRequest, secondResponse.StatusCode);
        var body = await secondResponse.Content.ReadAsStringAsync();
        Assert.Contains("ya fue utilizado", body);
    }

    [Fact]
    public async Task ResetPassword_UnknownToken_Returns400WithDomainMessage()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/reset-password", new ResetPasswordRequest("token-que-nunca-existio", "NewPassword123"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("no es válido", body);
    }

    [Fact]
    public async Task ResetPassword_ValidToken_NewPasswordWorksOnLogin_AndOldPasswordDoesNot()
    {
        var client = _factory.CreateClient();
        var email = $"reset-{Guid.NewGuid():N}@test.com";
        const string rawToken = "valid-raw-token";
        const string oldPassword = "OldPassword123";
        const string newPassword = "NewPassword456";

        await SeedPasswordResetTokenAsync(email, oldPassword, rawToken, DateTimeOffset.UtcNow.AddHours(1));

        var resetResponse = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(rawToken, newPassword));
        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        var loginWithNewPassword = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, newPassword));
        Assert.Equal(HttpStatusCode.OK, loginWithNewPassword.StatusCode);

        var loginWithOldPassword = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, oldPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, loginWithOldPassword.StatusCode);
    }

    [Fact]
    public async Task PasswordResetToken_PersistedTokenHash_DoesNotContainPlainTextToken()
    {
        const string rawToken = "plain-text-check-raw-token";
        var userId = await SeedPasswordResetTokenAsync(
            $"hashcheck-{Guid.NewGuid():N}@test.com", "Password123", rawToken, DateTimeOffset.UtcNow.AddHours(1));

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storedToken = await dbContext.PasswordResetTokens.AsNoTracking().FirstAsync(t => t.UserId == userId);

        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
        Assert.Equal(expectedHash, storedToken.TokenHash);
        Assert.NotEqual(rawToken, storedToken.TokenHash);
        Assert.DoesNotContain(rawToken, storedToken.TokenHash);
    }

    // Siembra directa vía AppDbContext: forgot-password nunca devuelve el token crudo en el body
    // (anti-enumeración incondicional), así que los tests que necesitan un token conocido lo insertan
    // directo en la BD, calculando su hash con el MISMO algoritmo que ForgotPasswordCommandHandler
    // (SHA-256 hex) — duplicado intencional del algoritmo de test, no un helper de producción expuesto.
    private async Task<Guid> SeedPasswordResetTokenAsync(string email, string password, string rawToken, DateTimeOffset expiresAt)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        var user = new User(Guid.NewGuid(), email, passwordHasher.Hash(password), UserRole.User);
        dbContext.Users.Add(user);

        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
        var resetToken = new PasswordResetToken(Guid.NewGuid(), user.Id, tokenHash, expiresAt);
        dbContext.PasswordResetTokens.Add(resetToken);

        await dbContext.SaveChangesAsync();

        return user.Id;
    }
}
