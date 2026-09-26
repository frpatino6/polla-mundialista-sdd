using PollaMundialista.Domain.Enums;

namespace PollaMundialista.Application.Dtos;

public record LoginResultDto(string Token, Guid UserId, string Email, UserRole Role);
