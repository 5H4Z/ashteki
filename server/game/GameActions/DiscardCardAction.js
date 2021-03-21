const CardGameAction = require('./CardGameAction');

class DiscardCardAction extends CardGameAction {
    setup() {
        super.setup();
        this.name = 'discard';
        this.effectMsg = 'discard {0}';
        this.cost = 'discarding {0}';
    }

    getEvent(card, context) {
        let location = card.location;
        let eventName =
            card.location === 'play area' || card.location === 'spellboard'
                ? 'onCardLeavesPlay'
                : 'onCardDiscarded';

        return super.createEvent(
            eventName,
            { card, context, location, showMessage: this.showMessage },
            (event) => {
                if (card.location === 'hand') {
                    context.game.cardsDiscarded.push(card);
                }
                card.owner.moveCard(card, card.discardLocation);

                if (event.showMessage) {
                    const discardingPlayer = this.player || context.player;
                    context.game.addMessage('{0} discards {1}', discardingPlayer, card);
                }
            }
        );
    }
}

module.exports = DiscardCardAction;
