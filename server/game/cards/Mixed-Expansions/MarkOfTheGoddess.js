const { BattlefieldTypes, CardType } = require('../../../constants.js');
const Card = require('../../Card.js');

class MarkOfTheGoddess extends Card {
    setupCardAbilities(ability) {
        this.play({
            // preferActionPromptMessage: true,
            message: '{0} plays {1}',
            messageArgs: (context) => [context.player, context.source],
            targets: {
                source: {
                    activePromptTitle: "Choose an opponent's card for attack value",
                    cardType: BattlefieldTypes,
                    controller: 'opponent',
                    cardCondition: (card) => !card.exhausted
                },
                victim: {
                    dependsOn: 'source',
                    activePromptTitle: "Choose another opponent's card to deal damage to",
                    cardType: [...BattlefieldTypes, CardType.Phoenixborn],
                    cardCondition: (card, context) => {
                        return (
                            card != context.targets.source &&
                            (BattlefieldTypes.includes(card.type) ||
                                card.controller.unitsInPlay.filter((c) => !c.exhausted).length ===
                                    1)
                        );
                    },
                    controller: 'opponent',
                    gameAction: ability.actions.dealDamage((context) => ({
                        amount: context.targets.source.attack,
                        showMessage: true
                    }))
                }
            }
        });
    }
}

MarkOfTheGoddess.id = 'mark-of-the-goddess';

module.exports = MarkOfTheGoddess;
