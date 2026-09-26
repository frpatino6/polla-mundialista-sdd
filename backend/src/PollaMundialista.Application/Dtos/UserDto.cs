using PollaMundialista.Domain.Enums;

namespace PollaMundialista.Application.Dtos;

public record UserDto(Guid Id, string Email, UserRole Role);
