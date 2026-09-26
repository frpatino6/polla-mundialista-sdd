using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Application.Enums;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.Application.Matches;

public class SubmitMatchResultCommandHandler : ICommandHandler<SubmitMatchResultCommand, Result<MatchDto>>
{
    private readonly IMatchRepository _matchRepository;
    private readonly IMediator _mediator;

    public SubmitMatchResultCommandHandler(IMatchRepository matchRepository, IMediator mediator)
    {
        _matchRepository = matchRepository;
        _mediator = mediator;
    }

    public async ValueTask<Result<MatchDto>> Handle(SubmitMatchResultCommand request, CancellationToken cancellationToken)
    {
        var match = await _matchRepository.GetByIdAsync(request.MatchId, cancellationToken);
        if (match is null)
            return Result<MatchDto>.Failure(ResultError.NotFound, "El partido no existe.");

        match.SetResult(new MatchResult(request.HomeScore, request.AwayScore));
        await _matchRepository.UpdateAsync(match, cancellationToken);

        var recalculateResult = await _mediator.Send(new RecalculateScoresCommand(request.MatchId), cancellationToken);
        if (!recalculateResult.IsSuccess)
            return Result<MatchDto>.Failure(recalculateResult.Error, recalculateResult.ErrorMessage!);

        var dto = new MatchDto(
            match.Id,
            match.Group,
            match.HomeTeam,
            match.AwayTeam,
            match.KickoffAt,
            match.Result?.HomeScore,
            match.Result?.AwayScore);

        return Result<MatchDto>.Success(dto);
    }
}
