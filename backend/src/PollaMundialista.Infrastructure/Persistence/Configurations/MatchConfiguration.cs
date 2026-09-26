using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Infrastructure.Persistence.Seed;

namespace PollaMundialista.Infrastructure.Persistence.Configurations;

public class MatchConfiguration : IEntityTypeConfiguration<Match>
{
    public void Configure(EntityTypeBuilder<Match> builder)
    {
        builder.HasKey(m => m.Id);

        // Se guarda como string ("A"/"B") en vez del entero por defecto de EF Core, para que la
        // columna sea legible directamente en la base de datos sin tener que consultar el enum.
        builder.Property(m => m.Group).HasConversion<string>();

        builder.Property(m => m.HomeTeam).IsRequired();
        builder.Property(m => m.AwayTeam).IsRequired();

        // Result es un owned type opcional. Se mapea en una tabla separada (en vez de table
        // splitting sobre Matches) porque MatchResult.HomeScore/AwayScore son `int` no-nullable:
        // si se mapearan como columnas nullable en la misma tabla, un resultado real "0-0" sería
        // indistinguible de "sin resultado aún". Con tabla separada, la presencia del resultado
        // la determina la existencia de la fila en MatchResults (FK compartida = MatchId).
        builder.OwnsOne(m => m.Result, r =>
        {
            r.ToTable("MatchResults");
            r.Property(x => x.HomeScore).HasColumnName("HomeScore").IsRequired();
            r.Property(x => x.AwayScore).HasColumnName("AwayScore").IsRequired();
        });

        builder.HasData(BuildSeedMatches());
    }

    private static IReadOnlyList<Match> BuildSeedMatches()
    {
        var entries = MatchSeedLoader.LoadFromRepoFixture();

        return entries
            .Select(entry =>
            {
                var id = DeterministicGuid.Create(
                    $"{entry.Group}|{entry.HomeTeam}|{entry.AwayTeam}|{entry.KickoffAt:O}");

                return new Match(id, entry.Group, entry.HomeTeam, entry.AwayTeam, entry.KickoffAt);
            })
            .ToList();
    }
}
