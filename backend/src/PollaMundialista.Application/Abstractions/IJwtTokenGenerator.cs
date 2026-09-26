using PollaMundialista.Domain.Enums;

namespace PollaMundialista.Application.Abstractions;

public interface IJwtTokenGenerator
{
    string GenerateToken(Guid userId, string email, UserRole role);
}
