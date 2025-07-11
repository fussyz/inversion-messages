import SignInForm from './SignInForm'

export const dynamic = 'force-dynamic'   // страница всегда SSR

type Props = {
  searchParams: { returnTo?: string }
}

export default function SignInPage({ searchParams }: Props) {
  const returnTo = searchParams.returnTo ?? '/admin'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center
                     gap-4 bg-black text-white">
      <h1 className="text-xl">Вход</h1>
      <SignInForm returnTo={returnTo} />
    </main>
  )
}
