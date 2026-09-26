using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Exceptions;
using PollaMundialista.Domain.Services;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.UnitTests.Domain.Entities;

public class PredictionTests
{
    [Fact]
    public void Constructor_MatchNotStarted_CreatesPrediction()
    {
        var id = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var matchId = Guid.NewGuid();
        var predictedResult = new MatchResult(2, 1);

        var prediction = new Prediction(id, userId, matchId, predictedResult, hasMatchStarted: false);

        Assert.Equal(id, prediction.Id);
        Assert.Equal(userId, prediction.UserId);
        Assert.Equal(matchId, prediction.MatchId);
        Assert.Equal(predictedResult, prediction.PredictedResult);
        Assert.Equal(0, prediction.PointsAwarded);
    }

    [Fact]
    public void Constructor_MatchAlreadyStarted_ThrowsDomainException()
    {
        var predictedResult = new MatchResult(2, 1);

        Assert.Throws<DomainException>(() =>
            new Prediction(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), predictedResult, hasMatchStarted: true));
    }

    [Fact]
    public void ChangePrediction_MatchNotStarted_UpdatesPredictedResult()
    {
        var prediction = new Prediction(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new MatchResult(1, 0), hasMatchStarted: false);
        var newPrediction = new MatchResult(3, 2);

        prediction.ChangePrediction(newPrediction, hasMatchStarted: false);

        Assert.Equal(newPrediction, prediction.PredictedResult);
    }

    [Fact]
    public void ChangePrediction_MatchAlreadyStarted_ThrowsDomainException()
    {
        var originalPrediction = new MatchResult(1, 0);
        var prediction = new Prediction(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), originalPrediction, hasMatchStarted: false);

        Assert.Throws<DomainException>(() => prediction.ChangePrediction(new MatchResult(3, 2), hasMatchStarted: true));
        Assert.Equal(originalPrediction, prediction.PredictedResult);
    }

    [Fact]
    public void RecalculatePoints_ExactMatch_DelegatesToScoringEngine_Returns3()
    {
        var predictedResult = new MatchResult(2, 1);
        var actualResult = new MatchResult(2, 1);
        var prediction = new Prediction(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), predictedResult, hasMatchStarted: false);

        prediction.RecalculatePoints(actualResult);

        Assert.Equal(ScoringEngine.CalculatePoints(predictedResult, actualResult), prediction.PointsAwarded);
        Assert.Equal(3, prediction.PointsAwarded);
    }

    [Fact]
    public void RecalculatePoints_CompleteMismatch_DelegatesToScoringEngine_Returns0()
    {
        var predictedResult = new MatchResult(2, 0);
        var actualResult = new MatchResult(0, 2);
        var prediction = new Prediction(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), predictedResult, hasMatchStarted: false);

        prediction.RecalculatePoints(actualResult);

        Assert.Equal(ScoringEngine.CalculatePoints(predictedResult, actualResult), prediction.PointsAwarded);
        Assert.Equal(0, prediction.PointsAwarded);
    }
}
