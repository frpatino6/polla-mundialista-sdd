using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Matches;

public class GetMatchesQueryHandler : IQueryHandler<GetMatchesQuery, Result<IReadOnlyList<MatchDto>>>
{
    private readonly IMatchRepository _matchRepository;

    public GetMatchesQueryHandler(IMatchRepository matchRepository)
    {
        _matchRepository = matchRepository;
    }

    public async ValueTask<Result<IReadOnlyList<MatchDto>>> Handle(GetMatchesQuery request, CancellationToken cancellationToken)
    {
        var matches = await _matchRepository.GetAllAsync(cancellationToken);

        var dtos = matches
            .Select(match => new MatchDto(
                match.Id,
                match.Group,
                match.HomeTeam,
                match.AwayTeam,
                match.KickoffAt,
                match.Result?.HomeScore,
                match.Result?.AwayScore))
            .ToList();

        return Result<IReadOnlyList<MatchDto>>.Success(dtos);
    }
}
