const { BattlefieldTypes } = require('../../../constants.js');
const Card = require('../../Card.js');

class LawOfDomination extends Card {
    setupCardAbilities(ability) {
        this.entersPlay({
            condition: (context) =>
                context.player.unitsInPlay.length > 0 &&
                context.player.opponent.unitsInPlay.length > 0,
            targets: {
                theirs: {
                    player: 'opponent',
                    controller: 'opponent',
                    CardType: BattlefieldTypes
                },
                mine: {
                    controller: 'self',
                    CardType: BattlefieldTypes,
                    gameAction: [
                        ability.actions.dealDamage((context) => ({
                            target: context.targets.theirs,
                            amount: context.targets.mine.attack,
                            unpreventable: true
                        })),
                        ability.actions.dealDamage((context) => ({
                            target: context.targets.mine,
                            amount: context.targets.theirs.attack,
                            unpreventable: true
                        }))
                    ]
                }
            }
        });

        this.persistentEffect({
            targetController: 'Any',
            effect: ability.effects.playerCannot('preventFightDamage')
        });

        this.bound();
        this.fleeting();
    }
}

LawOfDomination.id = 'law-of-domination';

module.exports = LawOfDomination;
