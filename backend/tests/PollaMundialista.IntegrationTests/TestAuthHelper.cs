using System.Net.Http.Headers;
using System.Net.Http.Json;
using PollaMundialista.Api.Controllers;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace PollaMundialista.IntegrationTests;

public static class TestAuthHelper
{
    public static async Task<(Guid UserId, string Token)> RegisterAndLoginAsync(HttpClient client, string email, string password)
    {
        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, password));
        registerResponse.EnsureSuccessStatusCode();

        return await LoginAsync(client, email, password);
    }

    public static async Task<(Guid UserId, string Token)> SeedAdminAndLoginAsync(
        CustomWebApplicationFactory factory, HttpClient client, string email, string password)
    {
        using (var scope = factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var admin = new User(Guid.NewGuid(), email, passwordHasher.Hash(password), UserRole.Admin);
            dbContext.Users.Add(admin);
            await dbContext.SaveChangesAsync();
        }

        return await LoginAsync(client, email, password);
    }

    public static void AttachToken(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static async Task<(Guid UserId, string Token)> LoginAsync(HttpClient client, string email, string password)
    {
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        loginResponse.EnsureSuccessStatusCode();

        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResultDto>();
        return (loginResult!.UserId, loginResult.Token);
    }
}
