using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Persistence.Configurations;

public class PasswordResetTokenConfiguration : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PasswordResetToken> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.TokenHash).IsRequired();
        builder.HasIndex(t => t.TokenHash).IsUnique();

        builder.HasIndex(t => t.UserId);
    }
}
