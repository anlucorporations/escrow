import { describe, it, expect, beforeEach } from 'vitest'
import {
  initSchema,
  query,
} from '../server/db.js'
import {
  acceptCommunityTerms,
  verifyContactChannels,
  setup2FASecret,
  confirm2FA,
  verifyThirdPartySBT,
  getUserIdentityProfile,
} from '../server/lib.js'

describe('Módulo de Identidad en 3 Niveles & SBTs', () => {
  const user1 = '0x1111111111111111111111111111111111111111'
  const user2 = '0x2222222222222222222222222222222222222222'

  beforeEach(async () => {
    await initSchema()
    await query('DELETE FROM users')
    // Registrar usuario base
    await query(
      `INSERT INTO users (address, username, identification_level, registered_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      [user1.toLowerCase(), 'alice', 'inscrito', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
    )
  })

  it('Nivel 1: Permite aceptar acuerdos de convivencia', async () => {
    const res = await acceptCommunityTerms(user1)
    expect(res.ok).toBe(true)

    const profile = await getUserIdentityProfile(user1, user1)
    expect(profile.terms_accepted).toBe(true)
    expect(profile.identification_level).toBe('inscrito')
  })

  it('Nivel 2: Valida correo y teléfono cifrados y activa 2FA para ascender a Verificado', async () => {
    // 1. Validar canales
    const contactRes = await verifyContactChannels(user1, {
      email: 'alice@truekeate.com',
      phone: '+584121234567',
      emailCode: '123456',
      phoneCode: '123456',
    })
    expect(contactRes.ok).toBe(true)

    // 2. Configurar e iniciar 2FA
    const setup = await setup2FASecret(user1)
    expect(setup.secret).toBeDefined()

    // 3. Confirmar 2FA
    const confirm = await confirm2FA(user1, '123456')
    expect(confirm.ok).toBe(true)
    expect(confirm.identificationLevel).toBe('verificado')

    // Verificar perfil actualizado
    const profile = await getUserIdentityProfile(user1, user1)
    expect(profile.identification_level).toBe('verificado')
    expect(profile.email_verified).toBe(true)
    expect(profile.phone_verified).toBe(true)
    expect(profile.two_factor_enabled).toBe(true)
  })

  it('Nivel 3: Verifica SBT de terceros y asciende a Certificado', async () => {
    const sbtRes = await verifyThirdPartySBT(user1, {
      sbtContract: '0x2B09ECe09c507920c44Ba6d81294F3841D7d472C',
      sbtProviderName: 'Binance BABT',
      tokenId: '1001',
    })

    expect(sbtRes.ok).toBe(true)
    expect(sbtRes.identificationLevel).toBe('certificado')
    expect(sbtRes.provider).toBe('Binance BABT')

    const profile = await getUserIdentityProfile(user1, user1)
    expect(profile.identification_level).toBe('certificado')
    expect(profile.sbt_provider).toBe('Binance BABT')
  })

  it('Privacidad y RBAC: Terceros solo ven datos públicos, el usuario y el Owner ven datos sensibles', async () => {
    await verifyContactChannels(user1, {
      email: 'privado@truekeate.com',
      phone: '+584149999999',
      emailCode: '123456',
      phoneCode: '123456',
    })

    // Consulta de un tercero (user2)
    const publicView: any = await getUserIdentityProfile(user1, user2, false)
    expect(publicView.address).toBe(user1.toLowerCase())
    expect(publicView.username).toBe('alice')
    expect(publicView.identification_level).toBe('inscrito')
    expect(publicView.email).toBeUndefined()
    expect(publicView.phone).toBeUndefined()
    expect(publicView.two_factor_secret).toBeUndefined()

    // Consulta del propio usuario (self)
    const selfView: any = await getUserIdentityProfile(user1, user1, false)
    expect(selfView.email).toBe('privado@truekeate.com')
    expect(selfView.phone).toBe('+584149999999')

    // Consulta del Owner (admin)
    const ownerView: any = await getUserIdentityProfile(user1, user2, true)
    expect(ownerView.email).toBe('privado@truekeate.com')
    expect(ownerView.phone).toBe('+584149999999')
  })
})
