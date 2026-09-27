using FluentValidation;

namespace PollaMundialista.Application.Auth;

public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(c => c.Token).NotEmpty();
        RuleFor(c => c.NewPassword).NotEmpty().MinimumLength(8);
    }
}
