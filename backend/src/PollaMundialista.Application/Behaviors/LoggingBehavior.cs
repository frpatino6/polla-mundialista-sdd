using Mediator;
using Microsoft.Extensions.Logging;
using PollaMundialista.Application.Common;

namespace PollaMundialista.Application.Behaviors;

public sealed class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IMessage
    where TResponse : IResult
{
    private readonly ILogger<TRequest> _logger;

    public LoggingBehavior(ILogger<TRequest> logger)
    {
        _logger = logger;
    }

    public async ValueTask<TResponse> Handle(
        TRequest message,
        MessageHandlerDelegate<TRequest, TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Ejecutando {RequestName}", requestName);

        var response = await next(message, cancellationToken);

        if (response.IsSuccess)
            _logger.LogInformation("{RequestName} finalizó correctamente", requestName);
        else
            _logger.LogWarning("{RequestName} finalizó con error {Error}: {ErrorMessage}", requestName, response.Error, response.ErrorMessage);

        return response;
    }
}
