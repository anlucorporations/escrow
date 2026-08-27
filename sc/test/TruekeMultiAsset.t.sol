// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SBTRegistry.sol";
import "../src/TruekeSBT.sol";
import "../src/UserRegistry.sol";
import "../src/TruekeRWA.sol";
import "../src/TruekeService.sol";
import "../src/TruekeEscrow.sol";
import "../src/MockERC20.sol";

// Mock para simular un SBT externo de terceros (ej. Binance BABT)
contract MockExternalSBT is ERC721 {
    constructor() ERC721("Binance Account Bound Token", "BABT") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}

contract TruekeMultiAssetTest is Test {
    SBTRegistry public sbtRegistry;
    TruekeSBT public nativeSBT;
    UserRegistry public userRegistry;
    TruekeRWA public rwaContract;
    TruekeService public serviceContract;
    TruekeEscrow public escrow;
    MockERC20 public brlt;
    MockExternalSBT public mockBABT;

    address public owner = address(this);
    address public user1 = address(0x101);
    address public user2 = address(0x102);
    address public arbiter = address(0x999);

    function setUp() public {
        // 1. Despliegue de Registros e Identidad
        sbtRegistry = new SBTRegistry();
        nativeSBT = new TruekeSBT();
        userRegistry = new UserRegistry();

        nativeSBT.setMinter(address(sbtRegistry));
        sbtRegistry.setNativeSBT(address(nativeSBT));

        // 2. Despliegue de RWA y Servicios
        rwaContract = new TruekeRWA(address(sbtRegistry));
        serviceContract = new TruekeService(address(sbtRegistry));

        // 3. Despliegue de Escrow y Tokens ERC-20
        escrow = new TruekeEscrow();
        escrow.setArbiter(arbiter);
        serviceContract.setEscrowAuthorization(address(escrow), true);

        brlt = new MockERC20("BRLT Community Token", "BRLT", 18);
        mockBABT = new MockExternalSBT();

        // Fondos iniciales
        brlt.mint(user1, 1000 ether);
        brlt.mint(user2, 1000 ether);
    }

    // ------------------------------------------------------------- 1. Identidad y SBTs

    function testUserRegistration3Tiers() public {
        // Nivel 1: Inscrito
        vm.prank(user1);
        userRegistry.register("alice");

        UserRegistry.UserProfile memory p1 = userRegistry.getUserProfile(user1);
        assertEq(p1.username, "alice");
        assertEq(uint256(p1.identificationLevel), uint256(UserRegistry.IdentificationLevel.Inscrito));
        assertTrue(p1.termsAccepted);

        // Nivel 2: Verificado
        userRegistry.setUserIdentificationLevel(user1, UserRegistry.IdentificationLevel.Verificado);
        assertEq(uint256(userRegistry.getIdentificationLevel(user1)), uint256(UserRegistry.IdentificationLevel.Verificado));

        // Nivel 3: Certificado
        userRegistry.setUserIdentificationLevel(user1, UserRegistry.IdentificationLevel.Certificado);
        assertEq(uint256(userRegistry.getIdentificationLevel(user1)), uint256(UserRegistry.IdentificationLevel.Certificado));
    }

    function testNativeSBTMintAndNonTransferable() public {
        // Solo el minter o el owner pueden emitir el SBT
        nativeSBT.mint(user1, "KYC Nativo TrueKeate");
        assertEq(nativeSBT.balanceOf(user1), 1);
        assertTrue(nativeSBT.locked(1));

        // Intento de transferencia entre usuarios debe REVERTIR (Soulbound)
        vm.prank(user1);
        vm.expectRevert("Soulbound: Token is non-transferable");
        nativeSBT.transferFrom(user1, user2, 1);
    }

    function testThirdPartySBTVerificationAndClaim() public {
        // Agregar Binance BABT como proveedor autorizado en SBTRegistry
        sbtRegistry.addProvider(address(mockBABT), "Binance BABT", 3, SBTRegistry.TokenStandard.ERC721, 0);

        // user2 no tiene token inicialmente
        (bool validBefore,,) = sbtRegistry.hasValidIdentity(user2);
        assertFalse(validBefore);

        // Emitir BABT a user2
        mockBABT.mint(user2, 555);

        // SBTRegistry detecta automáticamente la credencial de terceros
        (bool isValid, string memory provider, uint8 tier) = sbtRegistry.hasValidIdentity(user2);
        assertTrue(isValid);
        assertEq(provider, "Binance BABT");
        assertEq(tier, 3);

        // user2 puede solicitar su credencial nativa TruekeSBT respaldada por su BABT
        vm.prank(user2);
        uint256 tokenId = sbtRegistry.claimNativeSBTFromExternal(address(mockBABT));
        assertEq(tokenId, 1);
        assertEq(nativeSBT.balanceOf(user2), 1);
    }

    // ------------------------------------------------------------- 2. Tokenización RWA y Servicios

    function testMintRWAOnlyCertifiedUsers() public {
        bytes32 commitment = keccak256("Estado fisico: Excelente sin rayones");

        // user1 sin SBT intenta acuñar -> revierte
        vm.prank(user1);
        vm.expectRevert("Solo usuarios Nivel 3 (Certificados) pueden acunar bienes RWA");
        rwaContract.mintRWA(user1, "MacBook Pro M2", "Tecnologia", "QmHash123456", commitment);

        // Otorgar SBT nativo a user1
        nativeSBT.mint(user1, "KYC Verificado");

        // Ahora user1 puede acuñar su bien físico RWA
        vm.prank(user1);
        uint256 rwaId = rwaContract.mintRWA(user1, "MacBook Pro M2", "Tecnologia", "QmHash123456", commitment);
        assertEq(rwaId, 1);
        assertEq(rwaContract.ownerOf(1), user1);
    }

    function testServiceVoucherMintAndConsumeBurn() public {
        // Otorgar SBT a user2 para emitir servicios
        nativeSBT.mint(user2, "KYC Proveedor");

        vm.prank(user2);
        uint256 serviceId = serviceContract.createServiceBatch(
            user2, 10, "1 Hora de Consultoria Web3", "Servicios Profesionales", "QmServiceCID789"
        );
        assertEq(serviceId, 1);
        assertEq(serviceContract.balanceOf(user2, 1), 10);

        // Quema de 3 unidades tras prestar el servicio
        vm.prank(user2);
        serviceContract.consumeAndBurn(user2, 1, 3);
        assertEq(serviceContract.balanceOf(user2, 1), 7);
    }

    // ------------------------------------------------------------- 3. Escrow Multi-Activo y Ciclo de Vida

    function testMultiAssetAtomicSwapWithInTransit() public {
        // 1. Preparar activos:
        // user1 tiene RWA NFT (MacBook)
        nativeSBT.mint(user1, "KYC 1");
        vm.prank(user1);
        uint256 laptopId = rwaContract.mintRWA(user1, "MacBook Pro", "Tecnologia", "QmLaptopCID", keccak256("Nuevo"));

        // user2 tiene 5 Vouchers de Servicio
        nativeSBT.mint(user2, "KYC 2");
        vm.prank(user2);
        uint256 serviceId = serviceContract.createServiceBatch(user2, 5, "Diseno de Marca", "Diseno", "QmDesignCID");

        // 2. User1 crea Trueke: Ofrece 1 Laptop RWA a cambio de 2 Vouchers de Servicio
        TruekeEscrow.Asset memory assetA = TruekeEscrow.Asset({
            assetType: TruekeEscrow.AssetType.ERC721,
            tokenAddress: address(rwaContract),
            tokenId: laptopId,
            amount: 1
        });

        TruekeEscrow.Asset memory assetB = TruekeEscrow.Asset({
            assetType: TruekeEscrow.AssetType.ERC1155,
            tokenAddress: address(serviceContract),
            tokenId: serviceId,
            amount: 2
        });

        vm.startPrank(user1);
        rwaContract.approve(address(escrow), laptopId);
        uint256 tradeId = escrow.createTrade(assetA, assetB, block.timestamp + 7 days, false);
        vm.stopPrank();

        // 3. User1 despacha el producto y marca como 'InTransit'
        vm.prank(user1);
        escrow.setInTransit(tradeId, "DHL Tracking #987654321");

        TruekeEscrow.TradeOperation memory t1 = escrow.getTrade(tradeId);
        assertEq(uint256(t1.status), uint256(TruekeEscrow.TradeStatus.InTransit));
        assertEq(t1.trackingInfo, "DHL Tracking #987654321");

        // 4. User2 completa el intercambio depositando los 2 Vouchers
        vm.startPrank(user2);
        serviceContract.setApprovalForAll(address(escrow), true);
        escrow.completeTrade(tradeId);
        vm.stopPrank();

        // 5. Verificación de liquidación atómica bilateral:
        // user2 recibió el RWA NFT Laptop
        assertEq(rwaContract.ownerOf(laptopId), user2);
        // user1 recibió los 2 Vouchers de Servicio
        assertEq(serviceContract.balanceOf(user1, serviceId), 2);

        TruekeEscrow.TradeOperation memory tFinal = escrow.getTrade(tradeId);
        assertEq(uint256(tFinal.status), uint256(TruekeEscrow.TradeStatus.Completed));
    }
}
