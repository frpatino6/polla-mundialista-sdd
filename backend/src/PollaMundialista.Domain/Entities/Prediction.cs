using PollaMundialista.Domain.Exceptions;
using PollaMundialista.Domain.Services;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.Domain.Entities;

public class Prediction
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid MatchId { get; private set; }
    public MatchResult PredictedResult { get; private set; } = null!;
    public int PointsAwarded { get; private set; }

    // Constructor privado sin parámetros exclusivo para materialización de EF Core: el único
    // constructor público tiene "hasMatchStarted", que no mapea a ninguna propiedad persistida,
    // por lo que el constructor binding de EF Core no puede usarlo para reconstituir la entidad.
    private Prediction()
    {
    }

    public Prediction(Guid id, Guid userId, Guid matchId, MatchResult predictedResult, bool hasMatchStarted)
    {
        if (hasMatchStarted)
            throw new DomainException(DomainErrorMessages.PredictionAfterKickoffNotAllowed);

        Id = id;
        UserId = userId;
        MatchId = matchId;
        PredictedResult = predictedResult;
        PointsAwarded = 0;
    }

    public void ChangePrediction(MatchResult newPrediction, bool hasMatchStarted)
    {
        if (hasMatchStarted)
            throw new DomainException(DomainErrorMessages.PredictionChangeAfterKickoffNotAllowed);

        PredictedResult = newPrediction;
    }

    public void RecalculatePoints(MatchResult actualResult)
    {
        PointsAwarded = ScoringEngine.CalculatePoints(PredictedResult, actualResult);
    }
}
