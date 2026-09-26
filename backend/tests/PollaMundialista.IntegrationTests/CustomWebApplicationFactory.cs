using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PollaMundialista.Infrastructure.Persistence;

namespace PollaMundialista.IntegrationTests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public CustomWebApplicationFactory()
    {
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // AddDbContext registra tanto DbContextOptions<AppDbContext> como un IDbContextOptionsConfiguration<AppDbContext>
            // (interno) por cada llamada; hay que quitar ambos o el proveedor Npgsql original (Program.cs) queda mezclado
            // con Sqlite y EF Core lanza "solo se puede registrar un proveedor de base de datos".
            var descriptorsToRemove = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                    || (d.ServiceType.IsGenericType
                        && d.ServiceType.GenericTypeArguments.Length == 1
                        && d.ServiceType.GenericTypeArguments[0] == typeof(AppDbContext)
                        && d.ServiceType.FullName is not null
                        && d.ServiceType.FullName.Contains("DbContextOptionsConfiguration")))
                .ToList();

            foreach (var descriptor in descriptorsToRemove)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));

            using var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
            _connection.Dispose();
    }
}
