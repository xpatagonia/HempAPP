import { User, UserRole, Client } from '../../types';
import { isEventOnlyAttendee } from './eventsManagementService';

export const USER_META_START = '<!--HEMPC_USER_META:';

/**
 * Desempaqueta de forma segura los metadatos extendidos de usuario alojados en `job_title` de Supabase,
 * soportando tanto el formato actual `<!--HEMPC_USER_META:{...}-->` como el formato legacy `:END_USER_META-->`.
 */
export function unpackUserMetaFromJobTitle(rawJobTitle?: string | null): {
  cleanJobTitle: string;
  parsedMeta: Record<string, any>;
} {
  const str = String(rawJobTitle || '');
  const match = str.match(/<!--HEMPC_USER_META:(.*?)(?::END_USER_META)?-->/s);
  if (match && match[1]) {
    const cleanJobTitle = str
      .replace(/\s*<!--HEMPC_USER_META:.*?(?::END_USER_META)?-->/s, '')
      .trim();
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === 'object') {
        return { cleanJobTitle, parsedMeta: parsed };
      }
    } catch {}
    return { cleanJobTitle, parsedMeta: {} };
  }
  return { cleanJobTitle: str.trim(), parsedMeta: {} };
}

export interface CreatePendingPublicRegistrationInput {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  dniNumber?: string;
  organizationName?: string;
  localityOrProvince?: string;
  estimatedHectares?: number;
  requestedProfileType: NonNullable<User['requestedProfileType']>;
  registrationSource: NonNullable<User['registrationSource']>;
  isEventRegistration?: boolean;
  eventTicketCode?: string;
}

/**
 * Construye el registro de usuario en estado estrictamente retenido (`pending_approval`),
 * sin pedir contraseña en el formulario público y SIN crear registros en `public.clients`
 * hasta que un Administrador apruebe el alta.
 */
export function createPendingPublicRegistration(
  input: CreatePendingPublicRegistrationInput,
  existingUser?: User
): { user: User; activationToken: string } {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.name.trim();
  if (!cleanName || !cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Nombre completo y correo electrónico válido son obligatorios.');
  }

  const isAlreadyActiveAccount = Boolean(
    existingUser &&
      !isEventOnlyAttendee(existingUser) &&
      existingUser.accountStatus === 'active' &&
      !existingUser.passwordPendingSetup &&
      !String(existingUser.password || '').startsWith('__PENDING_')
  );

  const activationToken =
    existingUser?.activationToken ||
    `ACT-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;

  const effectiveProfile = input.isEventRegistration
    ? 'visitante'
    : input.requestedProfileType;

  const profileLabels: Record<NonNullable<User['requestedProfileType']>, string> = {
    visitante: 'Visitante / Invitado General',
    productor: 'Productor Agropecuario / Socio Cooperativo',
    tecnico_institucion: 'Alumno Diplomatura / Técnico (UNLZ, UATRE, INTA)',
    inversor_cadena: 'Inversor / Cadena Industrial'
  };

  const profileText = input.isEventRegistration
    ? 'Visitante al Evento / Invitado General'
    : profileLabels[effectiveProfile];

  const isEventVisitorRecord = Boolean(input.isEventRegistration && !isAlreadyActiveAccount);

  const user: User = {
    ...(existingUser || {}),
    id: existingUser?.id || input.id || `usr-self-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    accessScope: isEventVisitorRecord ? 'event_attendee' : 'system_user',
    password: isAlreadyActiveAccount
      ? existingUser!.password
      : isEventVisitorRecord
      ? '__EVENT_VISITOR_NO_SYSTEM_LOGIN__'
      : `__PENDING_APPROVAL_LOCKED_${activationToken}__`,
    passwordPendingSetup: isAlreadyActiveAccount ? false : true,
    activationToken,
    phone: input.phone?.trim() || existingUser?.phone,
    dniNumber: input.dniNumber?.trim() || existingUser?.dniNumber,
    role: isAlreadyActiveAccount
      ? existingUser!.role
      : effectiveProfile === 'productor'
      ? 'client'
      : 'viewer',
    // IMPORTANTE: No se asigna ni se crea clientId en public.clients hasta que un Administrador apruebe el alta
    clientId: isAlreadyActiveAccount ? existingUser?.clientId : undefined,
    jobTitle:
      isAlreadyActiveAccount && existingUser?.jobTitle
        ? `${existingUser.jobTitle.replace(
            /\s*•\s*Acreditado Un Día de Siembra \(21\/11\)/g,
            ''
          )}${input.isEventRegistration ? ' • Acreditado Un Día de Siembra (21/11)' : ''}`
        : `${profileText}${
            input.isEventRegistration ? ' • Acreditado Un Día de Siembra (21/11)' : ''
          }`,
    organizationName:
      input.organizationName?.trim() ||
      existingUser?.organizationName ||
      (effectiveProfile === 'productor'
        ? 'Establecimiento en Incorporación'
        : 'Visitante / Invitado General'),
    isNetworkMember: isAlreadyActiveAccount ? Boolean(existingUser?.isNetworkMember) : false,
    memberType: isAlreadyActiveAccount
      ? existingUser?.memberType
      : effectiveProfile === 'productor'
      ? 'Socio_Productor'
      : undefined,
    accountStatus: isAlreadyActiveAccount ? 'active' : 'pending_approval',
    registrationSource: input.registrationSource,
    requestedProfileType: isAlreadyActiveAccount
      ? existingUser?.requestedProfileType || effectiveProfile
      : effectiveProfile,
    eventRegistered: input.isEventRegistration ? true : existingUser?.eventRegistered,
    eventName: input.isEventRegistration
      ? 'Jornada Oficial: "Un Día de Siembra" (Sáb. 21 Nov)'
      : existingUser?.eventName,
    eventTicketCode: input.isEventRegistration
      ? input.eventTicketCode || existingUser?.eventTicketCode
      : existingUser?.eventTicketCode,
    eventAccreditationStatus: input.isEventRegistration ? 'pending_admin' : existingUser?.eventAccreditationStatus,
    eventConfirmedByEmail: false,
    eventProgramDownloaded: false,
    localityOrProvince:
      input.localityOrProvince?.trim() ||
      existingUser?.localityOrProvince ||
      'VIRCH – Trelew, Chubut',
    estimatedHectares:
      input.estimatedHectares !== undefined
        ? Number(input.estimatedHectares)
        : existingUser?.estimatedHectares,
    invitedAt: existingUser?.invitedAt || new Date().toISOString().split('T')[0],
    avatar:
      existingUser?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        cleanName
      )}&backgroundColor=b6e3f4`
  };

  return { user, activationToken };
}

/**
 * Compuerta de seguridad de Login: verifica si el usuario puede iniciar sesión o si requiere
 * aprobación del Administrador / configuración inicial de contraseña.
 * Bloquea de forma absoluta a los visitantes de jornadas/eventos (`event_attendee`).
 */
export function evaluateUserLoginGate(user: User | undefined | null): {
  canProceedToPasswordCheck: boolean;
  requiresPasswordActivationModal: boolean;
  blockedReason?: 'not_found' | 'pending_approval' | 'rejected' | 'event_visitor_no_system_access';
  userFacingMessage?: string;
} {
  if (!user) {
    return {
      canProceedToPasswordCheck: false,
      requiresPasswordActivationModal: false,
      blockedReason: 'not_found',
      userFacingMessage: 'Credenciales incorrectas. Verifique su correo y contraseña.'
    };
  }

  // BLOQUEO ESTRICTO: Los usuarios registrados como Visitantes de Jornadas / Eventos NO tienen acceso al sistema ni a los datos
  if (isEventOnlyAttendee(user)) {
    return {
      canProceedToPasswordCheck: false,
      requiresPasswordActivationModal: false,
      blockedReason: 'event_visitor_no_system_access',
      userFacingMessage: `Este correo corresponde a una Acreditación de Jornada / Evento (${
        user.eventTicketCode || 'Pase Visitante'
      }). Los registros de eventos se gestionan en el padrón de asistencia presencial y no poseen acceso al sistema interno de trazabilidad ni a los datos productivos.`
    };
  }

  if (user.accountStatus === 'pending_approval') {
    return {
      canProceedToPasswordCheck: false,
      requiresPasswordActivationModal: false,
      blockedReason: 'pending_approval',
      userFacingMessage: `Tu solicitud de alta en plataforma (Perfil: ${
        user.requestedProfileType === 'productor' ? 'Productor' : 'Operador'
      }) se encuentra PENDIENTE DE APROBACIÓN por la Administración. Una vez aprobada recibirás desde notificaciones@hempc.com.ar el enlace para crear tu contraseña.`
    };
  }

  if (user.accountStatus === 'rejected') {
    return {
      canProceedToPasswordCheck: false,
      requiresPasswordActivationModal: false,
      blockedReason: 'rejected',
      userFacingMessage:
        'Tu solicitud de acceso no ha sido aprobada por la administración cooperativa.'
    };
  }

  if (
    user.accountStatus === 'active' &&
    (user.passwordPendingSetup === true ||
      String(user.password || '').startsWith('__PENDING_'))
  ) {
    return {
      canProceedToPasswordCheck: false,
      requiresPasswordActivationModal: true
    };
  }

  return {
    canProceedToPasswordCheck: true,
    requiresPasswordActivationModal: false
  };
}

/**
 * Ejecuta la aprobación exclusiva por parte de un Administrador (`admin` o `super_admin`).
 * Si se aprueba como `"productor"`, busca una Organización (`Client`) coincidente o construye
 * automáticamente una nueva para vincular su `clientId` y garantizar el aislamiento multi-establecimiento.
 */
export function approvePendingRegistrationByAdmin(params: {
  adminUser: Pick<User, 'id' | 'name' | 'role'> | null | undefined;
  targetUser: User;
  approveAs: 'visitante' | 'productor';
  existingClients: Client[];
  generatedClientId?: string;
}): {
  approvedUser: User;
  newClientToCreate: Client | null;
  linkedClient: Client | null;
  activationToken: string;
  roleLabel: string;
} {
  const { adminUser, targetUser, approveAs, existingClients, generatedClientId } = params;

  if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
    throw new Error(
      'Acceso denegado: Solo un Administrador de la plataforma puede aprobar el alta definitiva de un usuario.'
    );
  }

  const roleAssigned: UserRole = approveAs === 'productor' ? 'client' : 'viewer';
  const roleLabel =
    approveAs === 'productor'
      ? 'Productor Asociado (Red Cooperativa)'
      : 'Visitante / Invitado General';

  const activationToken =
    targetUser.activationToken ||
    `ACT-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;

  const hasValidCustomPassword =
    Boolean(targetUser.password) &&
    !String(targetUser.password).startsWith('__PENDING_') &&
    targetUser.passwordPendingSetup !== true;

  let linkedClient: Client | null = null;
  let newClientToCreate: Client | null = null;
  let resolvedClientId: string | null = null;

  if (approveAs === 'productor') {
    const cleanOrgName = (targetUser.organizationName || '').trim();
    const isGenericOrgName =
      !cleanOrgName ||
      cleanOrgName.toLowerCase() === 'establecimiento en incorporación' ||
      cleanOrgName.toLowerCase() === 'visitante / invitado general' ||
      cleanOrgName.toLowerCase() === 'participante independiente';

    const effectiveOrgName = isGenericOrgName
      ? `Establecimiento ${targetUser.name.trim()}`
      : cleanOrgName;

    // 1. Buscar si ya existe el Client por ID o por nombre/email
    const existingMatch = (existingClients || []).find(
      c =>
        (targetUser.clientId && String(c.id) === String(targetUser.clientId)) ||
        (c.name && c.name.trim().toLowerCase() === effectiveOrgName.toLowerCase()) ||
        (c.email && c.email.trim().toLowerCase() === targetUser.email.trim().toLowerCase())
    );

    if (existingMatch) {
      linkedClient = existingMatch;
      resolvedClientId = existingMatch.id;
    } else {
      const newId =
        generatedClientId ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `client-prod-${Date.now()}`);
      newClientToCreate = {
        id: newId,
        name: effectiveOrgName,
        contactName: targetUser.name.trim(),
        contactPhone: targetUser.phone || '',
        email: targetUser.email.trim().toLowerCase(),
        type:
          targetUser.estimatedHectares && targetUser.estimatedHectares > 20
            ? 'Productor Grande (>20 ha)'
            : targetUser.estimatedHectares && targetUser.estimatedHectares >= 5
            ? 'Productor Mediano (5-15 ha)'
            : 'Productor Pequeño (0-5 ha)',
        cuit: targetUser.dniNumber || undefined,
        address: targetUser.localityOrProvince || 'VIRCH – Chubut',
        isNetworkMember: true,
        membershipLevel: 'Activo',
        notes: `Organización habilitada por Administración (${adminUser.name}) al aprobar el alta del productor ${targetUser.name}.`
      };
      linkedClient = newClientToCreate;
      resolvedClientId = newId;
    }
  }

  const approvedUser: User = {
    ...targetUser,
    accessScope: 'system_user',
    role: roleAssigned,
    structureRole: approveAs === 'productor' ? 'propietario' : 'monitoreador',
    clientId: approveAs === 'productor' ? resolvedClientId : null,
    organizationName:
      approveAs === 'productor' && linkedClient
        ? linkedClient.name
        : targetUser.organizationName || 'Visitante / Invitado General',
    isNetworkMember: approveAs === 'productor',
    memberType: approveAs === 'productor' ? 'Socio_Productor' : undefined,
    requestedProfileType: approveAs,
    accountStatus: 'active',
    activationToken,
    passwordPendingSetup: !hasValidCustomPassword,
    password: hasValidCustomPassword
      ? targetUser.password
      : `__PENDING_APPROVAL_LOCKED_${activationToken}__`,
    approvedBy: adminUser.name || 'Administración Central HempC',
    approvedAt: new Date().toISOString().split('T')[0]
  };

  return {
    approvedUser,
    newClientToCreate,
    linkedClient,
    activationToken,
    roleLabel
  };
}

/**
 * Valida y aplica la activación de contraseña definitiva por parte del usuario aprobado.
 * Bloquea cualquier intento si `accountStatus !== 'active'`, si es un visitante de evento (`event_attendee`)
 * o si el `activationToken` no coincide.
 */
export function activateApprovedAccountPassword(params: {
  targetUser: User | null | undefined;
  providedToken?: string;
  newPassword: string;
  confirmPassword: string;
}): {
  success: boolean;
  errorMessage?: string;
  activatedUser?: User;
} {
  const { targetUser, providedToken, newPassword, confirmPassword } = params;

  if (!targetUser) {
    return {
      success: false,
      errorMessage:
        'No se encontró una solicitud aprobada para este correo. Verificá el correo o aguardá la confirmación de Administración.'
    };
  }

  if (isEventOnlyAttendee(targetUser)) {
    return {
      success: false,
      errorMessage:
        'Este correo corresponde exclusivamente a una Acreditación de Jornada / Evento y no requiere contraseña ni acceso al sistema interno de datos.'
    };
  }

  if (targetUser.accountStatus === 'pending_approval') {
    return {
      success: false,
      errorMessage:
        'Tu solicitud aún figura Pendiente de Aprobación por los Administradores. Podrás definir tu contraseña apenas sea aprobada.'
    };
  }

  if (targetUser.accountStatus === 'rejected') {
    return {
      success: false,
      errorMessage: 'Esta solicitud no se encuentra habilitada por la Administración.'
    };
  }

  if (
    targetUser.activationToken &&
    providedToken !== undefined &&
    providedToken.trim() !== '' &&
    targetUser.activationToken.trim().toUpperCase() !== providedToken.trim().toUpperCase()
  ) {
    return {
      success: false,
      errorMessage:
        'El código de activación no coincide con el enviado en el correo de aprobación.'
    };
  }

  const cleanPwd = (newPassword || '').trim();
  const cleanConfirm = (confirmPassword || '').trim();

  if (cleanPwd.length < 6) {
    return {
      success: false,
      errorMessage: 'La contraseña debe tener al menos 6 caracteres por seguridad.'
    };
  }

  if (cleanPwd !== cleanConfirm) {
    return {
      success: false,
      errorMessage:
        'Las contraseñas ingresadas no coinciden. Verificalas e intentá nuevamente.'
    };
  }

  const activatedUser: User = {
    ...targetUser,
    password: cleanPwd,
    passwordPendingSetup: false,
    accountStatus: 'active'
  };

  return {
    success: true,
    activatedUser
  };
}
