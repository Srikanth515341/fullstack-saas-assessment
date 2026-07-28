export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

// Covers nav + the auth, general, security, team, activity, admin, api-keys,
// and tasks pages. Still not a full-app rewrite — routes stay at their
// current URLs (no `[locale]` segment), so this is locale-aware content
// rendering, not locale-aware routing. See docs/section-c-level3.md for
// what full routing-level i18n would additionally require.
const dictionaries = {
  en: {
    nav: {
      team: 'Team',
      general: 'General',
      activity: 'Activity',
      security: 'Security',
      notes: 'Notes',
      tasks: 'Tasks',
      apiKeys: 'API Keys',
      admin: 'Admin'
    },
    auth: {
      signInTitle: 'Sign in to your account',
      signUpTitle: 'Create your account',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      signUp: 'Sign up',
      forgotPassword: 'Forgot password?',
      newToPlatform: 'New to our platform?',
      alreadyHaveAccount: 'Already have an account?',
      createAccount: 'Create an account',
      signInToExisting: 'Sign in to existing account',
      orContinueWith: 'Or continue with'
    },
    general: {
      title: 'General Settings',
      accountInfo: 'Account Information',
      name: 'Name',
      displayName: 'Display Name',
      bio: 'Bio',
      saveChanges: 'Save Changes',
      saving: 'Saving...'
    },
    security: {
      title: 'Security Settings',
      password: 'Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmNewPassword: 'Confirm New Password',
      updatePassword: 'Update Password',
      updating: 'Updating...',
      deleteAccount: 'Delete Account',
      deleteWarning: 'Account deletion is non-reversable. Please proceed with caution.',
      confirmPassword: 'Confirm Password',
      typeToConfirm: 'Type DELETE to confirm',
      deleting: 'Deleting...'
    },
    team: {
      title: 'Team Settings',
      subscription: 'Team Subscription',
      currentPlan: 'Current Plan',
      manageSubscription: 'Manage Subscription',
      members: 'Team Members',
      noMembers: 'No team members yet.',
      remove: 'Remove',
      invite: 'Invite Team Member',
      inviteEmail: 'Email',
      inviteRole: 'Role',
      inviting: 'Inviting...',
      inviteButton: 'Invite Member'
    },
    activity: {
      title: 'Activity Log',
      recent: 'Recent Activity',
      empty: 'No activity yet',
      emptyHint: "When you perform actions like signing in or updating your account, they'll appear here.",
      exportCsv: 'Export CSV'
    },
    admin: {
      title: 'Admin',
      allUsers: 'All Users',
      allTeams: 'All Teams'
    },
    apiKeys: {
      title: 'API Keys',
      publicApiAccess: 'Public API Access',
      newKey: 'New Key',
      creating: 'Creating...',
      noKeys: 'No API keys yet',
      noKeysHint: 'Create one above to start using the public API.',
      revoke: 'Revoke'
    },
    tasks: {
      title: 'Tasks',
      myTasks: 'My Tasks',
      addPlaceholder: 'Add a new task...',
      addButton: 'Add Task',
      noTasks: 'No tasks yet',
      noTasksHint: 'Add your first task above to get started.',
      noMatchingTasks: 'No matching tasks',
      noMatchingTasksHint: 'Try a different search term or clear your filters.',
      exportCsv: 'Export CSV',
      trash: 'Trash',
      suggestTasks: 'Suggest Tasks'
    }
  },
  fr: {
    nav: {
      team: 'Équipe',
      general: 'Général',
      activity: 'Activité',
      security: 'Sécurité',
      notes: 'Notes',
      tasks: 'Tâches',
      apiKeys: 'Clés API',
      admin: 'Administration'
    },
    auth: {
      signInTitle: 'Connectez-vous à votre compte',
      signUpTitle: 'Créez votre compte',
      email: 'E-mail',
      password: 'Mot de passe',
      signIn: 'Se connecter',
      signUp: "S'inscrire",
      forgotPassword: 'Mot de passe oublié ?',
      newToPlatform: 'Nouveau sur notre plateforme ?',
      alreadyHaveAccount: 'Vous avez déjà un compte ?',
      createAccount: 'Créer un compte',
      signInToExisting: 'Se connecter à un compte existant',
      orContinueWith: 'Ou continuez avec'
    },
    general: {
      title: 'Paramètres généraux',
      accountInfo: 'Informations du compte',
      name: 'Nom',
      displayName: "Nom d'affichage",
      bio: 'Biographie',
      saveChanges: 'Enregistrer',
      saving: 'Enregistrement...'
    },
    security: {
      title: 'Paramètres de sécurité',
      password: 'Mot de passe',
      currentPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe',
      confirmNewPassword: 'Confirmer le nouveau mot de passe',
      updatePassword: 'Mettre à jour le mot de passe',
      updating: 'Mise à jour...',
      deleteAccount: 'Supprimer le compte',
      deleteWarning: 'La suppression du compte est irréversible. Veuillez procéder avec prudence.',
      confirmPassword: 'Confirmer le mot de passe',
      typeToConfirm: 'Tapez DELETE pour confirmer',
      deleting: 'Suppression...'
    },
    team: {
      title: "Paramètres de l'équipe",
      subscription: "Abonnement de l'équipe",
      currentPlan: 'Forfait actuel',
      manageSubscription: "Gérer l'abonnement",
      members: "Membres de l'équipe",
      noMembers: "Aucun membre d'équipe pour le moment.",
      remove: 'Retirer',
      invite: 'Inviter un membre',
      inviteEmail: 'E-mail',
      inviteRole: 'Rôle',
      inviting: 'Invitation...',
      inviteButton: 'Inviter le membre'
    },
    activity: {
      title: "Journal d'activité",
      recent: 'Activité récente',
      empty: "Aucune activité pour le moment",
      emptyHint: 'Lorsque vous effectuez des actions comme vous connecter ou mettre à jour votre compte, elles apparaîtront ici.',
      exportCsv: 'Exporter en CSV'
    },
    admin: {
      title: 'Administration',
      allUsers: 'Tous les utilisateurs',
      allTeams: 'Toutes les équipes'
    },
    apiKeys: {
      title: 'Clés API',
      publicApiAccess: 'Accès API public',
      newKey: 'Nouvelle clé',
      creating: 'Création...',
      noKeys: "Aucune clé API pour le moment",
      noKeysHint: "Créez-en une ci-dessus pour commencer à utiliser l'API publique.",
      revoke: 'Révoquer'
    },
    tasks: {
      title: 'Tâches',
      myTasks: 'Mes tâches',
      addPlaceholder: 'Ajouter une nouvelle tâche...',
      addButton: 'Ajouter une tâche',
      noTasks: 'Aucune tâche pour le moment',
      noTasksHint: 'Ajoutez votre première tâche ci-dessus pour commencer.',
      noMatchingTasks: 'Aucune tâche correspondante',
      noMatchingTasksHint: 'Essayez un autre terme de recherche ou effacez vos filtres.',
      exportCsv: 'Exporter en CSV',
      trash: 'Corbeille',
      suggestTasks: 'Suggérer des tâches'
    }
  }
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function parseLocale(value: string | undefined | null): Locale {
  return value === 'fr' ? 'fr' : defaultLocale;
}
