namespace PollaMundialista.Application.Abstractions;

public interface IEmailSender
{
    Task SendPasswordResetLinkAsync(string email, string token, CancellationToken ct = default);
}
