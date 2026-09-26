using FluentValidation;
using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Enums;

namespace PollaMundialista.Application.Behaviors;

public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IMessage
    where TResponse : IResult<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async ValueTask<TResponse> Handle(
        TRequest message,
        MessageHandlerDelegate<TRequest, TResponse> next,
        CancellationToken cancellationToken)
    {
        var validator = _validators.FirstOrDefault();
        if (validator is not null)
        {
            var validationResult = await validator.ValidateAsync(message, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
                return TResponse.Failure(ResultError.Validation, errors);
            }
        }

        return await next(message, cancellationToken);
    }
}
