using PollaMundialista.Application.Abstractions;

namespace PollaMundialista.Infrastructure.Services;

public class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
