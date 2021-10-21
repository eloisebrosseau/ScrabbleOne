export enum SystemMessages {
    DebugOff = 'Affichage du débogage désactivé',
    DebugOn = 'Affichage du débogage activé',
    HelpMessage = `Commandes disponibles: !placer <rangée><colonne><direction: h ou v> <mot>: permet de placer une lettre
        \n!aide\n!debug\n!réserve\n!échanger\n`,
    HelpTitle = "Capsule d'aide",
    ImpossibleAction = 'Action impossible à réaliser',
    InvalidCommand = 'Commande non reconnue',
    InvalidFormat = 'Erreur de syntaxe',
    InvalidLetters = "Vous n'avez pas saisi des lettres",
    InvalidOptions = 'Options fournies invalides',
    InvalidTurn = "Ce n'est pas à votre tour... Patience",
    InvalidUserMessage = 'Format du message invalide',
    InvalidWord = 'Vous devez saisir un mot',
    NotEnoughLetters = "Il n'y a pas suffisamment de lettres dans votre chevalet",
    LetterPossessionError = 'Vous ne possédez pas la lettre :',
    EmptyReserveError = 'La réserve est vide, donc vous ne pouvez plus piger de lettres',
    ReserveContentTitle = 'Contenu de la réserve:',
}
