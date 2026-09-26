using FluentValidation;

namespace PollaMundialista.Application.Predictions;

public class RegisterPredictionCommandValidator : AbstractValidator<RegisterPredictionCommand>
{
    public RegisterPredictionCommandValidator()
    {
        RuleFor(c => c.PredictedHomeScore).GreaterThanOrEqualTo(0);
        RuleFor(c => c.PredictedAwayScore).GreaterThanOrEqualTo(0);
    }
}
