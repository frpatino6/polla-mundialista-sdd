using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Persistence.Configurations;

public class PredictionConfiguration : IEntityTypeConfiguration<Prediction>
{
    public void Configure(EntityTypeBuilder<Prediction> builder)
    {
        builder.HasKey(p => p.Id);

        // Regla de design.md §6: nunca dos predicciones activas del mismo usuario para el mismo
        // partido (garantiza el upsert en RegisterPredictionCommandHandler).
        builder.HasIndex(p => new { p.UserId, p.MatchId }).IsUnique();

        // No se agrega una FK formal de Prediction.MatchId hacia Match.Id (shadow relationship)
        // ni una FK hacia User.Id: no hay navigation properties en el modelo de Domain, no hay
        // creación real de usuarios todavía (llega en la Tarea #5), y no aporta valor funcional
        // hoy mantenerla — se documenta como decisión explícita, no como omisión accidental.

        // PredictedResult es un owned type requerido (siempre presente), por lo que se mapea con
        // table splitting normal en la misma tabla Predictions.
        builder.OwnsOne(p => p.PredictedResult, r =>
        {
            r.Property(x => x.HomeScore).HasColumnName("PredictedHomeScore").IsRequired();
            r.Property(x => x.AwayScore).HasColumnName("PredictedAwayScore").IsRequired();
        });
    }
}
