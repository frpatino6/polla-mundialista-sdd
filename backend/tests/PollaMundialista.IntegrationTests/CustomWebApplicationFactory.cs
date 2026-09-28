using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PollaMundialista.Infrastructure.Persistence;

namespace PollaMundialista.IntegrationTests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    // Secret de prueba fijo, solo para que los tests de integración sean autocontenidos:
    // Program.cs (WebApplication.CreateBuilder) carga user-secrets en Development, y este
    // host de test corre en Development por defecto. Sin este valor, la suite dependería
    // silenciosamente de que la máquina tenga configurado `dotnet user-secrets set "Jwt:Secret" ...`
    // para el UserSecretsId del proyecto Api. No es un secreto real, no se usa en producción.
    //
    // Se inyecta como variable de entorno del PROCESO (no vía ConfigureWebHost/ConfigureAppConfiguration)
    // porque Program.cs lee "Jwt" de forma síncrona y EAGER, ANTES de builder.Build():
    //   var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
    // WebApplicationFactory intercepta un Program.cs de hosting mínimo justo alrededor de la
    // llamada a builder.Build(), así que un ConfigureAppConfiguration agregado ahí llega demasiado
    // tarde para esa lectura eager: el JwtBearerOptions de validación quedaría armado con el secret
    // viejo (real, de user-secrets) mientras que el login (vía IOptions, resuelto perezosamente)
    // firmaría con el secret nuevo — firma vs. validación desincronizadas, 401 en toda request
    // autenticada. Confirmado empíricamente: con ConfigureAppConfiguration, login (200) pero las
    // llamadas autenticadas posteriores fallaban con 401.
    //
    // Fijando la variable de entorno ANTES de que se construya el host (en el constructor de esta
    // factory, que corre antes de que WebApplicationFactory dispare la creación perezosa del host),
    // WebApplication.CreateBuilder(args) la incorpora desde el arranque vía su propio AddEnvironmentVariables()
    // (que en ASP.NET Core se agrega DESPUÉS de AddUserSecrets en Development), por lo que ya está
    // presente para la lectura eager de la línea 46 de Program.cs y para cualquier lectura perezosa
    // posterior — ambas ven el mismo valor.
    private const string TestJwtSecret = "9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8";

    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public CustomWebApplicationFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", TestJwtSecret);

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
