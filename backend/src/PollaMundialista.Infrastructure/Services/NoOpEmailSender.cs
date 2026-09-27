using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PollaMundialista.Application.Abstractions;

namespace PollaMundialista.Infrastructure.Services;

public class NoOpEmailSender : IEmailSender
{
    private readonly ILogger<NoOpEmailSender> _logger;
    private readonly IHostEnvironment _environment;

    public NoOpEmailSender(ILogger<NoOpEmailSender> logger, IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public Task SendPasswordResetLinkAsync(string email, string token, CancellationToken ct = default)
    {
        // No hay proveedor de email real (fuera de alcance de la prueba técnica, design.md §7.2).
        // En Development se loguea el token del lado servidor para poder probar el flujo end-to-end
        // manualmente; en cualquier otro entorno se descarta sin dejar rastro. El token NUNCA se
        // expone en el body de la respuesta HTTP de forgot-password, en ningún entorno — eso rompería
        // la garantía de anti-enumeración (ver ForgotPasswordCommandHandler).
        if (_environment.IsDevelopment())
            _logger.LogInformation("[DEV] Enlace de reseteo de contraseña para {Email}: token={Token}", email, token);

        return Task.CompletedTask;
    }
}
