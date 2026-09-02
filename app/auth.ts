'use server';

// Server Actions para Autenticación (Registro y Login)
// Todas las operaciones con contraseñas, Prisma y Service Role se ejecutan exclusivamente en el servidor.

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { Rol, EstadoCliente } from '@prisma/client';
import { encontrarZonaMasCercana } from '@/lib/services/geolocalizacion';

export interface RegistroFormState {
  success?: boolean;
  error?: string;
  redirectTo?: string;
}

export interface LoginFormState {
  success?: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Server Action para el Registro de Clientes Profesionales.
 * 1. Crea la cuenta en Supabase Auth (auth.users) sin asignar roles en user_metadata.
 * 2. En una transacción atómica de Prisma, crea el registro en 'usuarios' y 'clientes'.
 * 3. Con Service Role (Supabase Admin), actualiza app_metadata: { rol: 'CLIENTE_PROFESIONAL' }
 *    (inmutable desde el cliente, utilizado para autorización y middleware).
 * 4. Si la transacción de Prisma falla, elimina el usuario de Supabase Auth con la Service Role Key para evitar usuarios huérfanos.
 */
export async function registroProfesionalAction(
  prevState: RegistroFormState | null,
  formData: FormData
): Promise<RegistroFormState> {
  try {
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;
    const nombre = (formData.get('nombre') as string)?.trim();
    const apellido = (formData.get('apellido') as string)?.trim();
    const salon = (formData.get('salon') as string)?.trim();
    const whatsapp = (formData.get('whatsapp') as string)?.trim();
    const provincia = (formData.get('provincia') as string)?.trim();
    const localidad = (formData.get('localidad') as string)?.trim();
    const pais = (formData.get('pais') as string)?.trim() || 'Argentina';
    const instagram = (formData.get('instagram') as string)?.trim() || null;
    const cuit = (formData.get('cuit') as string)?.trim() || null;
    const tipoDeNegocio = (formData.get('tipoDeNegocio') as string)?.trim();
    const yaComproSteffen = formData.get('yaComproSteffen') === 'true';
    const comoConocioSteffen = (formData.get('comoConocioSteffen') as string)?.trim() || null;

    // Coordenadas geográficas opcionales (desde Google Places Autocomplete)
    const latitudRaw = (formData.get('latitud') as string)?.trim();
    const longitudRaw = (formData.get('longitud') as string)?.trim();
    const latitud = latitudRaw && !isNaN(parseFloat(latitudRaw)) ? parseFloat(latitudRaw) : null;
    const longitud = longitudRaw && !isNaN(parseFloat(longitudRaw)) ? parseFloat(longitudRaw) : null;

    // Validaciones básicas de campos requeridos
    if (!email || !password || !nombre || !apellido || !salon || !whatsapp || !provincia || !localidad || !tipoDeNegocio) {
      return { error: 'Por favor completá todos los campos obligatorios marcados con *.' };
    }

    if (password.length < 6) {
      return { error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const supabase = await createServerSupabaseClient();

    // 1. Crear usuario en Supabase Auth (solo metadatos no críticos de presentación en user_metadata)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          apellido,
          salon,
        },
      },
    });

    if (authError || !authData.user) {
      if (
        authError?.code === 'user_already_exists' ||
        authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already exists')
      ) {
        return {
          error: 'Ya existe una cuenta registrada con este email. Iniciá sesión o usá otro email.',
        };
      }

      return {
        error: authError?.message || 'No se pudo crear la cuenta en el servicio de autenticación.',
      };
    }

    const authUserId = authData.user.id;

    // 2. Transacción en Prisma para crear Usuario y Cliente
    try {
      // Determinar la zona asignada:
      // A) Si se aportaron coordenadas, buscar únicamente por cercanía geográfica (radio <= 50 km)
      const coordenadasProvistas = latitud !== null && longitud !== null;
      let zonaAsignadaId: string | null = null;

      if (coordenadasProvistas) {
        const zonaCercana = await encontrarZonaMasCercana(latitud, longitud);
        if (zonaCercana) {
          zonaAsignadaId = zonaCercana.id;
        }
      }

      await prisma.$transaction(async (tx) => {
        // B) Si no se aportaron coordenadas en absoluto, buscar por coincidencia de texto como respaldo
        if (!coordenadasProvistas && !zonaAsignadaId) {
          const zonaPorTexto = await tx.zona.findFirst({
            where: {
              provincia: { equals: provincia, mode: 'insensitive' },
              localidad: { equals: localidad, mode: 'insensitive' },
            },
          });
          if (zonaPorTexto) {
            zonaAsignadaId = zonaPorTexto.id;
          }
        }

        // Crear Usuario interno
        const usuario = await tx.usuario.create({
          data: {
            authUserId,
            email,
            rol: Rol.CLIENTE_PROFESIONAL,
          },
        });

        // Crear Cliente profesional vinculado
        await tx.cliente.create({
          data: {
            usuarioId: usuario.id,
            nombre,
            apellido,
            salon,
            whatsapp,
            email,
            provincia,
            localidad,
            pais,
            latitud,
            longitud,
            instagram,
            cuit,
            tipoDeNegocio,
            yaComproSteffen,
            comoConocioSteffen,
            zonaId: zonaAsignadaId,
            estadoCliente: EstadoCliente.PENDIENTE_APROBACION, // Default por requerimiento
            // beneficioActual tiene default en el schema ("15% OFF primer pedido")
          },
        });
      });
    } catch (prismaError) {
      console.error('Error al guardar en base de datos tras signUp. Iniciando rollback...', prismaError);

      // Rollback: eliminar usuario huérfano de Supabase Auth usando el cliente Admin (Service Role)
      try {
        const supabaseAdmin = createAdminSupabaseClient();
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        console.log(`Rollback completado: usuario ${authUserId} eliminado de Supabase Auth.`);
      } catch (rollbackError) {
        console.error('Fallo crítico al realizar rollback en Supabase Auth:', rollbackError);
      }

      return {
        error: 'Hubo un error al registrar los datos del salón en la base de datos. Por favor intentá nuevamente.',
      };
    }

    // 3. Fuera del try/catch de rollback: setear el rol y estado en app_metadata vía Service Role.
    try {
      const supabaseAdmin = createAdminSupabaseClient();
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        app_metadata: {
          rol: 'CLIENTE_PROFESIONAL',
          estadoCliente: EstadoCliente.PENDIENTE_APROBACION,
        },
      });
    } catch (metadataError) {
      console.error(
        'No se pudo sincronizar app_metadata tras el registro. Se corregirá en el próximo login.',
        metadataError
      );
    }

    return {
      success: true,
      redirectTo: '/?registro=exitoso',
    };
  } catch (error: any) {
    console.error('Error no controlado en registroProfesionalAction:', error);
    
    if (
      error?.code === 'user_already_exists' ||
      error?.message?.toLowerCase().includes('already registered') ||
      error?.message?.toLowerCase().includes('already exists')
    ) {
      return {
        error: 'Ya existe una cuenta registrada con este email. Iniciá sesión o usá otro email.',
      };
    }

    return {
      error: error?.message || 'Ocurrió un error inesperado al procesar el registro. Por favor intentá nuevamente.',
    };
  }
}

/**
 * Server Action para Inicio de Sesión (Login)
 * 1. Autentica credenciales vía supabase.auth.signInWithPassword().
 * 2. Actualiza la fecha Cliente.ultimoAcceso en PostgreSQL.
 * 3. Auto-corrección: compara usuario.rol (fuente de verdad en Postgres) contra authData.user.app_metadata?.rol
 *    y sincroniza app_metadata si están desfasados.
 * 4. Determina la ruta según el Rol (CLIENTE_PROFESIONAL -> /catalogo, ADMIN -> /admin).
 */
export async function loginAction(
  prevState: LoginFormState | null,
  formData: FormData
): Promise<LoginFormState> {
  try {
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { error: 'Ingresá tu email y contraseña.' };
    }

    const supabase = await createServerSupabaseClient();

    // 1. Iniciar sesión en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return {
        error: 'Email o contraseña incorrectos. Verificá tus datos.',
      };
    }

    const authUserId = authData.user.id;

    try {
      // 2. Buscar usuario en PostgreSQL para obtener el Rol y el perfil de Cliente
      const usuario = await prisma.usuario.findUnique({
        where: { authUserId },
        include: { cliente: true },
      });

      if (usuario?.cliente) {
        // Bloquear login si el cliente tiene estado BLOQUEADO
        if (usuario.cliente.estadoCliente === EstadoCliente.BLOQUEADO) {
          await supabase.auth.signOut();
          return {
            error: 'Tu cuenta se encuentra bloqueada por administración. Por favor contactate con Steffen por WhatsApp.',
          };
        }

        // 3. Actualizar fecha de último acceso en el servidor
        try {
          await prisma.cliente.update({
            where: { id: usuario.cliente.id },
            data: { ultimoAcceso: new Date() },
          });
        } catch (updateErr) {
          console.error('No se pudo actualizar ultimoAcceso:', updateErr);
        }
      }

      // 4. Auto-corrección de sincronización de app_metadata con la fuente de verdad (Postgres)
      const appMetadataRol = authData.user.app_metadata?.rol;
      const appMetadataEstado = authData.user.app_metadata?.estadoCliente;
      const estadoActual = usuario?.cliente?.estadoCliente || null;

      const acabaDeSerAprobado = appMetadataEstado !== 'ACTIVO' && estadoActual === EstadoCliente.ACTIVO;

      if (usuario && (usuario.rol !== appMetadataRol || estadoActual !== appMetadataEstado)) {
        try {
          const supabaseAdmin = createAdminSupabaseClient();
          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            app_metadata: {
              rol: usuario.rol,
              estadoCliente: estadoActual,
            },
          });
        } catch (syncError) {
          console.error('No se pudo sincronizar app_metadata en login:', syncError);
        }
      }

      // 5. Redirigir según el rol del usuario y estado del cliente
      const rol = usuario?.rol || appMetadataRol;
      if (rol === Rol.ADMIN || rol === 'ADMIN') {
        return {
          success: true,
          redirectTo: '/admin',
        };
      }

      const estadoFinal = estadoActual || appMetadataEstado;
      if (estadoFinal && estadoFinal !== EstadoCliente.ACTIVO && estadoFinal !== 'ACTIVO') {
        return {
          success: true,
          redirectTo: '/?cuenta=pendiente',
        };
      }

      if (acabaDeSerAprobado) {
        return {
          success: true,
          redirectTo: '/?cuenta=aprobada',
        };
      }

      return {
        success: true,
        redirectTo: '/',
      };
    } catch (dbError) {
      console.error('Error en base de datos al autenticar usuario:', dbError);
      return {
        success: true,
        redirectTo: '/',
      };
    }
  } catch (error: any) {
    console.error('Error crítico no capturado en loginAction:', error);
    return {
      error: error?.message || 'Ocurrió un error al intentar iniciar sesión. Por favor intentá nuevamente.',
    };
  }
}
