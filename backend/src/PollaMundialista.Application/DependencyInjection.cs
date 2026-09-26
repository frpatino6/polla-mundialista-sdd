using FluentValidation;
using Mediator;
using Microsoft.Extensions.DependencyInjection;
using PollaMundialista.Application.Behaviors;
using PollaMundialista.Application.Predictions;

namespace PollaMundialista.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediator(options => options.ServiceLifetime = ServiceLifetime.Scoped);

        services.AddValidatorsFromAssemblyContaining<RegisterPredictionCommandValidator>();

        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        return services;
    }
}
