import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * Layout raíz para todas las rutas administrativas (/admin/*).
 * Implementa la Capa 2 de Defensa en Profundidad:
 * 1. Verifica la sesión activa del usuario a través de cookies de servidor en Supabase Auth.
 * 2. Consulta de forma estricta a PostgreSQL (Prisma) como ÚNICA FUENTE DE VERDAD para el rol ADMIN.
 * 3. Si el usuario no tiene rol ADMIN en la base de datos, rechaza el acceso y redirige a /catalogo.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Verificación estricta en PostgreSQL como fuente de verdad
  let usuario = await prisma.usuario.findUnique({
    where: { authUserId: user.id },
  });

  if (!usuario && user.email) {
    const usuarioPorEmail = await prisma.usuario.findUnique({
      where: { email: user.email.toLowerCase() },
    });
    if (usuarioPorEmail) {
      usuario = await prisma.usuario.update({
        where: { id: usuarioPorEmail.id },
        data: { authUserId: user.id },
      });
    }
  }

  if (!usuario || (usuario.rol !== Rol.ADMIN && (usuario.rol as string) !== 'ADMIN')) {
    redirect('/catalogo');
  }

  return <>{children}</>;
}
