using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Options;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Infrastructure.Security;

namespace PollaMundialista.UnitTests.Infrastructure.Security;

public class JwtTokenGeneratorTests
{
    private static JwtTokenGenerator CreateGenerator(int expirationMinutes = 60)
    {
        var options = Options.Create(new JwtOptions
        {
            Secret = "this-is-a-development-only-test-secret-key-32+",
            Issuer = "PollaMundialista",
            Audience = "PollaMundialista",
            ExpirationMinutes = expirationMinutes
        });

        return new JwtTokenGenerator(options);
    }

    [Fact]
    public void GenerateToken_ValidData_ReturnsNonEmptyJwtWithThreeParts()
    {
        var generator = CreateGenerator();

        var token = generator.GenerateToken(Guid.NewGuid(), "user@example.com", UserRole.User);

        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(3, token.Split('.').Length);
    }

    [Fact]
    public void GenerateToken_ValidData_ContainsExpectedClaims()
    {
        var generator = CreateGenerator();
        var userId = Guid.NewGuid();

        var token = generator.GenerateToken(userId, "user@example.com", UserRole.Admin);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Contains(jwt.Claims, c => c.Type is JwtRegisteredClaimNames.Sub or ClaimTypes.NameIdentifier && c.Value == userId.ToString());
        Assert.Contains(jwt.Claims, c => c.Type is JwtRegisteredClaimNames.Email or ClaimTypes.Email && c.Value == "user@example.com");
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Role && c.Value == nameof(UserRole.Admin));
    }

    [Fact]
    public void GenerateToken_ValidData_ExpirationMatchesConfiguredMinutes()
    {
        const int expirationMinutes = 60;
        var generator = CreateGenerator(expirationMinutes);
        var before = DateTime.UtcNow;

        var token = generator.GenerateToken(Guid.NewGuid(), "user@example.com", UserRole.User);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        var expectedExpiry = before.AddMinutes(expirationMinutes);
        Assert.True(Math.Abs((jwt.ValidTo - expectedExpiry).TotalSeconds) < 30);
    }
}
