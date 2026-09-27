using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.Exceptions;

namespace PollaMundialista.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; }
    public string PasswordHash { get; private set; }
    public UserRole Role { get; private set; }

    public User(Guid id, string email, string passwordHash, UserRole role)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new DomainException(DomainErrorMessages.InvalidEmail);

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException(DomainErrorMessages.PasswordHashRequired);

        Id = id;
        Email = email;
        PasswordHash = passwordHash;
        Role = role;
    }

    public void ChangePassword(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new DomainException(DomainErrorMessages.PasswordHashRequired);

        PasswordHash = newPasswordHash;
    }
}
