import { ethers, Wallet } from "ethers";
import { keccak256 } from "../../utils";
import provideUploadManifest, {
  ChainSettings,
  UploadManifest,
} from "./upload.manifest";

describe("uploadManifest", () => {
  let uploadManifest: UploadManifest;
  const mockFilesystem = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    statSync: jest.fn(),
  } as any;
  const mockAddToIpfs = jest.fn();
  const mockAgentName = "agent name";
  const mockAgentDisplayName = "agent display name";
  const mockDescription = "some description";
  const mockLongDescription = "some long description";
  const mockAgentId = "0xagentId";
  const mockVersion = "0.1";
  const mockDocumentation = "README.md";
  const mockRepository = "github.com/myrepository";
  const mockLicenseUrl = "github.com/myrepository";
  const mockPromoUrl = "github.com/myrepository";
  const mockImageRef = "123abc";
  const mockPrivateKey = "0xabcd";
  const mockCliVersion = "0.2";
  const mockChainIds = [1, 1337];
  const mockExternal = false;
  const mockChainSettings = {
    default: {
      shards: 1,
      target: 1,
    },
    1: {
      shards: "5",
      target: "10",
    },
    "137": {
      shards: "2",
      targets: 3,
    },
  } as any;
  const formattedMockChainSettings = {
    default: {
      shards: 1,
      target: 1,
    },
    "1": {
      shards: 5,
      target: 10,
    },
    "137": {
      shards: 2,
      targets: 3,
    },
  };

  const resetMocks = () => {
    mockFilesystem.existsSync.mockReset();
    mockFilesystem.statSync.mockReset();
  };

  beforeAll(() => {
    uploadManifest = provideUploadManifest(
      mockFilesystem,
      mockAddToIpfs,
      mockAgentName,
      mockAgentDisplayName,
      mockDescription,
      mockLongDescription,
      mockAgentId,
      mockVersion,
      mockDocumentation,
      mockRepository,
      mockLicenseUrl,
      mockPromoUrl,
      mockCliVersion,
      mockChainIds,
      mockExternal,
      mockChainSettings
    );
  });

  beforeEach(() => {
    resetMocks();
  });

  it("throws error if documentation not found", async () => {
    mockFilesystem.existsSync.mockReturnValueOnce(false);

    try {
      await uploadManifest(mockImageRef, mockPrivateKey);
    } catch (e) {
      expect(e.message).toBe(
        `documentation file ${mockDocumentation} not found`
      );
    }

    expect(mockFilesystem.existsSync).toHaveBeenCalledTimes(1);
    expect(mockFilesystem.existsSync).toHaveBeenCalledWith(mockDocumentation);
  });

  it("throws error if documentation file is empty", async () => {
    mockFilesystem.existsSync.mockReturnValueOnce(true);
    mockFilesystem.statSync.mockReturnValueOnce({ size: 0 });

    try {
      await uploadManifest(mockImageRef, mockPrivateKey);
    } catch (e) {
      expect(e.message).toBe(
        `documentation file ${mockDocumentation} cannot be empty`
      );
    }

    expect(mockFilesystem.existsSync).toHaveBeenCalledTimes(1);
    expect(mockFilesystem.existsSync).toHaveBeenCalledWith(mockDocumentation);
    expect(mockFilesystem.statSync).toHaveBeenCalledTimes(1);
    expect(mockFilesystem.statSync).toHaveBeenCalledWith(mockDocumentation);
  });

  it("uploads signed manifest to ipfs and returns ipfs reference", async () => {
    const systemTime = new Date();
    jest.useFakeTimers().setSystemTime(systemTime);
    mockFilesystem.existsSync.mockReturnValueOnce(true);
    mockFilesystem.statSync.mockReturnValueOnce({ size: 1 });
    const mockDocumentationFile = JSON.stringify({ some: "documentation" });
    mockFilesystem.readFileSync.mockReturnValueOnce(mockDocumentationFile);
    const mockDocumentationRef = "docRef";
    mockAddToIpfs.mockReturnValueOnce(mockDocumentationRef);
    const mockManifest = {
      from: new Wallet(mockPrivateKey).address,
      name: mockAgentDisplayName,
      description: mockDescription,
      longDescription: mockLongDescription,
      agentId: mockAgentName,
      agentIdHash: mockAgentId,
      version: mockVersion,
      timestamp: systemTime.toUTCString(),
      imageReference: mockImageRef,
      documentation: mockDocumentationRef,
      repository: mockRepository,
      licenseUrl: mockLicenseUrl,
      promoUrl: mockPromoUrl,
      chainIds: mockChainIds,
      publishedFrom: `Forta CLI ${mockCliVersion}`,
      external: mockExternal,
      chainSettings: formattedMockChainSettings,
    };
    const mockManifestRef = "manifestRef";
    mockAddToIpfs.mockReturnValueOnce(mockManifestRef);

    const manifestRef = await uploadManifest(mockImageRef, mockPrivateKey);

    expect(manifestRef).toBe(mockManifestRef);
    expect(mockFilesystem.existsSync).toHaveBeenCalledTimes(1);
    expect(mockFilesystem.existsSync).toHaveBeenCalledWith(mockDocumentation);
    expect(mockFilesystem.statSync).toHaveBeenCalledTimes(1);
    expect(mockFilesystem.statSync).toHaveBeenCalledWith(mockDocumentation);
    expect(mockFilesystem.readFileSync).toHaveBeenCalledTimes(1);
    expect(mockFilesystem.readFileSync).toHaveBeenCalledWith(
      mockDocumentation,
      "utf8"
    );
    expect(mockAddToIpfs).toHaveBeenCalledTimes(2);
    expect(mockAddToIpfs).toHaveBeenNthCalledWith(1, mockDocumentationFile);
    const signingKey = new ethers.utils.SigningKey(mockPrivateKey);
    const signature = ethers.utils.joinSignature(
      signingKey.signDigest(keccak256(JSON.stringify(mockManifest)))
    );
    expect(mockAddToIpfs).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({ manifest: mockManifest, signature })
    );
    jest.useRealTimers();
  });
});
