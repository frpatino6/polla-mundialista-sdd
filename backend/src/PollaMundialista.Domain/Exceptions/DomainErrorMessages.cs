namespace PollaMundialista.Domain.Exceptions;

public static class DomainErrorMessages
{
    public const string InvalidMatchGroup = "Group debe ser un valor válido de MatchGroup (A o B).";
    public const string HomeTeamRequired = "HomeTeam no puede estar vacío.";
    public const string AwayTeamRequired = "AwayTeam no puede estar vacío.";
    public const string TeamsMustDiffer = "Un equipo no puede jugar contra sí mismo.";
    public const string InvalidEmail = "Email inválido.";
    public const string PasswordHashRequired = "PasswordHash no puede estar vacío.";
    public const string HomeScoreCannotBeNegative = "HomeScore no puede ser negativo.";
    public const string AwayScoreCannotBeNegative = "AwayScore no puede ser negativo.";
    public const string PredictionAfterKickoffNotAllowed = "No se puede registrar una predicción después del kickoff del partido.";
    public const string PredictionChangeAfterKickoffNotAllowed = "No se puede modificar una predicción después del kickoff del partido.";
    public const string TokenHashRequired = "TokenHash no puede estar vacío.";
    public const string PasswordResetTokenAlreadyConsumed = "El token de reseteo ya fue utilizado.";
}
