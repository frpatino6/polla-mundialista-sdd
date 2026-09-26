using PollaMundialista.Infrastructure.Security;

namespace PollaMundialista.UnitTests.Infrastructure.Security;

public class BcryptPasswordHasherTests
{
    private readonly BcryptPasswordHasher _hasher = new();

    [Fact]
    public void Hash_GivenPassword_ReturnsDifferentStringThanPassword()
    {
        var hash = _hasher.Hash("Sup3rSecret!");

        Assert.NotEqual("Sup3rSecret!", hash);
    }

    [Fact]
    public void Hash_CalledTwiceWithSamePassword_ReturnsDifferentHashes()
    {
        var hash1 = _hasher.Hash("Sup3rSecret!");
        var hash2 = _hasher.Hash("Sup3rSecret!");

        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void Verify_CorrectPassword_ReturnsTrue()
    {
        var hash = _hasher.Hash("Sup3rSecret!");

        var result = _hasher.Verify("Sup3rSecret!", hash);

        Assert.True(result);
    }

    [Fact]
    public void Verify_IncorrectPassword_ReturnsFalse()
    {
        var hash = _hasher.Hash("Sup3rSecret!");

        var result = _hasher.Verify("WrongPassword!", hash);

        Assert.False(result);
    }
}
