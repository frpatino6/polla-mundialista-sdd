using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Infrastructure.Persistence;
using PollaMundialista.Infrastructure.Persistence.Repositories;
using PollaMundialista.Infrastructure.Security;
using PollaMundialista.Infrastructure.Services;

namespace PollaMundialista.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IMatchRepository, MatchRepository>();
        services.AddScoped<IPredictionRepository, PredictionRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IEmailSender, NoOpEmailSender>();
        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));

        return services;
    }
}
