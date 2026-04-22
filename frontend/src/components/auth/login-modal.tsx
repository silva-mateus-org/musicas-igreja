'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@core/components/ui/dialog'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Label } from '@core/components/ui/label'
import { useToast } from '@core/hooks/use-toast'
import { useAuth } from '@core/contexts/auth-context'
import { LogIn, Loader2, Music, Key, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'

// Zod schemas for validation
const loginSchema = z.object({
    username: z.string().min(1, 'Usuário é obrigatório'),
    password: z.string().min(1, 'Senha é obrigatória'),
})

const changePasswordSchema = z.object({
    newPassword: z.string().min(4, 'A nova senha deve ter pelo menos 4 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

type LoginFormData = z.infer<typeof loginSchema>
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

interface LoginModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
    const { toast } = useToast()
    const { login, changePassword } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    
    const [showChangePassword, setShowChangePassword] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)

    // Login form
    const loginForm = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    })

    // Change password form
    const changePasswordForm = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            newPassword: '',
            confirmPassword: '',
        },
    })

    const handleLogin = async (data: LoginFormData) => {
        setIsLoading(true)
        try {
            const result = await login(data.username, data.password)
            if (result.mustChangePassword) {
                setCurrentPassword(data.password)
                setShowChangePassword(true)
                toast({
                    title: 'Troca de senha obrigatória',
                    description: 'Por favor, defina uma nova senha para continuar.',
                })
            } else {
                toast({
                    title: 'Login realizado!',
                    description: 'Bem-vindo ao sistema!',
                })
                onOpenChange(false)
                resetForms()
                window.location.reload()
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Credenciais inválidas'
            toast({
                title: 'Erro no login',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleChangePassword = async (data: ChangePasswordFormData) => {
        setIsLoading(true)
        try {
            await changePassword(currentPassword, data.newPassword)
            toast({
                title: 'Senha alterada!',
                description: 'Sua senha foi alterada com sucesso.',
            })
            onOpenChange(false)
            resetForms()
            window.location.reload()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Não foi possível alterar a senha'
            toast({
                title: 'Erro ao alterar senha',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const resetForms = () => {
        loginForm.reset()
        changePasswordForm.reset()
        setShowChangePassword(false)
        setCurrentPassword('')
        setShowNewPassword(false)
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            resetForms()
        }
        onOpenChange(isOpen)
    }

    if (showChangePassword) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Key className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <DialogTitle className="text-center">Alterar Senha</DialogTitle>
                        <DialogDescription className="text-center">
                            <span className="flex items-center justify-center gap-2 text-muted-foreground">
                                <AlertCircle className="h-4 w-4" />
                                Você precisa criar uma nova senha para continuar
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={changePasswordForm.handleSubmit(handleChangePassword)} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    placeholder="Digite a nova senha"
                                    {...changePasswordForm.register('newPassword')}
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                    className={changePasswordForm.formState.errors.newPassword ? 'border-destructive' : ''}
                                    aria-invalid={!!changePasswordForm.formState.errors.newPassword}
                                    aria-describedby={changePasswordForm.formState.errors.newPassword ? 'new-password-error' : undefined}
                                />
                                <SimpleTooltip label="Mostrar/ocultar senha">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </SimpleTooltip>
                            </div>
                            {changePasswordForm.formState.errors.newPassword && (
                                <p id="new-password-error" role="alert" className="text-sm text-destructive">{changePasswordForm.formState.errors.newPassword.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                            <Input
                                id="confirm-password"
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Confirme a nova senha"
                                {...changePasswordForm.register('confirmPassword')}
                                disabled={isLoading}
                                autoComplete="new-password"
                                className={changePasswordForm.formState.errors.confirmPassword ? 'border-destructive' : ''}
                                aria-invalid={!!changePasswordForm.formState.errors.confirmPassword}
                                aria-describedby={changePasswordForm.formState.errors.confirmPassword ? 'confirm-password-error' : undefined}
                            />
                            {changePasswordForm.formState.errors.confirmPassword && (
                                <p id="confirm-password-error" role="alert" className="text-sm text-destructive">{changePasswordForm.formState.errors.confirmPassword.message}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Alterando...
                                </>
                            ) : (
                                <>
                                    <Key className="h-4 w-4" />
                                    Alterar Senha
                                </>
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex justify-center mb-2">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Music className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <DialogTitle className="text-center">Entrar no Sistema</DialogTitle>
                    <DialogDescription className="text-center">
                        Entre para acessar funcionalidades de edição e upload
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="modal-username">Usuário</Label>
                        <Input
                            id="modal-username"
                            type="text"
                            placeholder="Digite seu usuário"
                            {...loginForm.register('username')}
                            disabled={isLoading}
                            autoComplete="username"
                            className={loginForm.formState.errors.username ? 'border-destructive' : ''}
                            aria-invalid={!!loginForm.formState.errors.username}
                            aria-describedby={loginForm.formState.errors.username ? 'username-error' : undefined}
                        />
                        {loginForm.formState.errors.username && (
                            <p id="username-error" role="alert" className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="modal-password">Senha</Label>
                        <Input
                            id="modal-password"
                            type="password"
                            placeholder="Digite sua senha"
                            {...loginForm.register('password')}
                            disabled={isLoading}
                            autoComplete="current-password"
                            className={loginForm.formState.errors.password ? 'border-destructive' : ''}
                            aria-invalid={!!loginForm.formState.errors.password}
                            aria-describedby={loginForm.formState.errors.password ? 'password-error' : undefined}
                        />
                        {loginForm.formState.errors.password && (
                            <p id="password-error" role="alert" className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                        )}
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Entrando...
                            </>
                        ) : (
                            <>
                                <LogIn className="h-4 w-4" />
                                Entrar
                            </>
                        )}
                    </Button>
                </form>

            </DialogContent>
        </Dialog>
    )
}
