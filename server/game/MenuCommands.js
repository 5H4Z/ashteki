const GameActions = require('./GameActions');

class MenuCommands {
    static cardMenuClick(menuItem, game, player, card) {
        switch (menuItem.command) {
            case 'addDamage':
                game.addAlert('danger', '{0} adds a damage to {1}', player, card);
                card.addToken('damage', 1);
                break;
            case 'remDamage':
                game.addAlert('danger', '{0} removes a damage from {1}', player, card);
                card.removeToken('damage', 1);
                break;
            case 'addExhaustion':
                game.addAlert('danger', '{0} adds an exhaustion to {1}', player, card);
                card.addToken('exhaustion', 1);
                break;
            case 'remExhaustion':
                game.addAlert('danger', '{0} removes an exhaustion from {1}', player, card);
                card.removeToken('exhaustion', 1);
                break;
            case 'addStatus':
                game.addAlert('danger', '{0} adds a status to {1}', player, card);
                card.addToken('status', 1);
                break;
            case 'remStatus':
                game.addAlert('danger', '{0} removes a status from {1}', player, card);
                card.removeToken('status', 1);
                break;
            case 'control':
                if (player.opponent) {
                    game.addAlert(
                        'danger',
                        '{0} gives {1} control of {2}',
                        player,
                        player.opponent,
                        card
                    );
                    card.setDefaultController(player.opponent);
                }

                break;
            case 'detachDie':
                if (card.dieUpgrades.length === 1) {
                    player.removeDieAttachments(card);
                    game.addAlert(
                        'danger',
                        '{0} removes {1} from {2}',
                        player,
                        card.dieUpgrades[0],
                        card
                    );
                    return true;
                }

                break;
            case 'attach':
                game.promptForSelect(player, {
                    activePromptTitle: 'Select a card to attach to',
                    waitingPromptTitle: 'Waiting for opponent to attach a card',
                    cardCondition: (c) => c.location === 'play area',
                    onSelect: (player, c) => {
                        GameActions.attach({
                            target: c,
                            upgrade: card
                        }).resolve(card, game.getFrameworkContext(player));

                        game.addAlert('danger', '{0} attaches {1} to {2}', player, card, c);
                        return true;
                    }
                });

                break;
        }
    }

    static dieMenuClick(menuItem, game, player, die) {
        switch (menuItem.command) {
            case 'exhaust':
                if (die.exhausted) {
                    game.addAlert('danger', '{0} readies {1}', player, die.name);
                    die.ready();
                } else {
                    game.addAlert('danger', '{0} exhausts {1}', player, die.name);
                    die.exhaust();
                }
                break;
            case 'raise':
                game.addAlert('danger', '{0} raises {1}', player, die.name);
                die.raise();
                break;
            case 'lower':
                game.addAlert('danger', '{0} lowers {1}', player, die.name);
                die.lower();
                break;
            case 'attach':
                game.promptForSelect(player, {
                    activePromptTitle: 'Select a card',
                    waitingPromptTitle: 'Waiting for opponent to attach die',
                    cardCondition: (card) =>
                        card.location === 'play area' || card.location === 'spellboard',
                    onSelect: (p, card) => {
                        GameActions.attachDie({
                            target: card,
                            upgradeDie: die
                        }).resolve(die, game.getFrameworkContext(player));

                        game.addAlert('danger', '{0} attaches {1} to {2}', p, die, card);
                        return true;
                    }
                });

                break;
            case 'detach':
                player.removeDieAttachments(die.parent);
                break;
        }
    }
}

module.exports = MenuCommands;
