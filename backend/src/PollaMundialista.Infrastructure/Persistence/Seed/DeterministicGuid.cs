using System.Security.Cryptography;
using System.Text;

namespace PollaMundialista.Infrastructure.Persistence.Seed;

/// <summary>
/// Deriva un Guid estable a partir de un string de entrada, usando el hash MD5 del texto
/// como bytes del Guid. Necesario porque `HasData` de EF Core exige claves primarias estables
/// entre regeneraciones de la migración, y el fixture de partidos no trae un Id propio.
/// </summary>
public static class DeterministicGuid
{
    public static Guid Create(string input)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(input));
        return new Guid(bytes);
    }
}
