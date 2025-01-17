const _ = require('underscore');
const { EffectLocations } = require('../../constants.js');

const BaseStep = require('./basestep.js');
const TriggeredAbilityWindowTitles = require('./triggeredabilitywindowtitles.js');

class ForcedTriggeredAbilityWindow extends BaseStep {
    constructor(game, abilityType, window, eventsToExclude = []) {
        super(game);
        // choices holds all of the abilities that were triggered by the event - this may be more than one for a single card
        this.choices = [];
        // all of the events that are being handled together - e.g. events and child events
        this.events = [];
        this.eventWindow = window;
        this.eventsToExclude = eventsToExclude;
        this.abilityType = abilityType; // forcedInterrupt / forcedReaction etc.

        this.currentPlayer = this.game.betweenRounds
            ? this.game.roundFirstPlayer // first player chooses first between rounds (p13)
            : this.game.activePlayer; // active player chooses first within rounds

        // record who went first, and who second
        if (this.currentPlayer) {
            this.firstPlayer = this.currentPlayer;
            this.secondPlayer = this.currentPlayer.opponent;
        }

        this.resolvedAbilities = [];
        this.pressedDone = false;
    }

    continue() {
        this.game.currentAbilityWindow = this;
        if (this.eventWindow) {
            this.emitEvents();
        }

        if (this.filterChoices()) {
            // all done
            this.game.currentAbilityWindow = null;
            return true;
        }

        return false;
    }

    addChoice(context) {
        if (!this.hasAbilityBeenTriggered(context)) {
            this.choices.push(context);
        }
    }

    hasAbilityBeenTriggered(context) {
        return this.resolvedAbilities.some(
            (resolved) => resolved.ability === context.ability && resolved.event === context.event
        );
    }

    filterChoices() {
        if (this.choices.length === 0) return true;
        let myChoices = this.choices.filter((c) => c.player === this.currentPlayer);

        // No choices left, or player pressed 'done'
        if (myChoices.length === 0 || this.pressedDone) {
            // flip players
            if (this.currentPlayer === this.firstPlayer) {
                this.currentPlayer = this.secondPlayer;
                return this.filterChoices();
            }
            return true;
        }

        // autoResolve choices are things that don't impact other objects e.g. Silver Snake gains a status
        let autoResolveChoice = myChoices.find((context) => context.ability.autoResolve);
        if (autoResolveChoice) {
            this.resolveAbility(autoResolveChoice);
            return false;
        }

        if (myChoices.length === 1) {
            this.resolveAbility(myChoices[0]);
            return false;
        }

        if (_.uniq(myChoices, (context) => context.source).length === 1) {
            // All choices share a source
            this.promptBetweenAbilities(myChoices, false);
        } else {
            // Choose an card to trigger
            this.promptBetweenSources(myChoices);
        }
        return false;
    }

    // choose a card that is tied to the ability / choices available
    promptBetweenSources(choices) {
        // lasting Triggers appear to be separate from immediate card abilities.
        // add them as buttons
        let lastingTriggers = _.uniq(
            choices.filter(
                (context) =>
                    context.ability.isLastingAbilityTrigger ||
                    context.source.location === 'being played'
            ),
            (context) => context.ability
        );
        let lastingTriggerCards = lastingTriggers.map((context) => context.source);
        let buttons = [];
        for (let i = 0; i < lastingTriggerCards.length; i++) {
            buttons.push({ text: lastingTriggerCards[i].name, arg: i.toString() });
        }

        // set up the PROPERTIES for the select prompt
        let defaultProperties = this.getPromptForSelectProperties(this.currentPlayer);
        let properties = Object.assign({}, defaultProperties);
        properties.buttons = buttons.concat(defaultProperties.buttons);

        // remove lasting Triggers from selection (they're added as buttons above)
        properties.cardCondition = (card) =>
            !lastingTriggerCards.includes(card) &&
            choices.some((context) => context.source === card);

        // onSelect
        properties.onSelect = (player, card) => {
            this.promptBetweenAbilities(choices.filter((context) => context.source === card));
            return true;
        };

        // onMenuCommand
        properties.onMenuCommand = (player, arg) => {
            if (defaultProperties.onMenuCommand(player, arg)) {
                return true;
            }

            this.promptBetweenAbilities(
                choices.filter((context) => context.source === lastingTriggerCards[parseInt(arg)])
            );
            return true;
        };

        this.game.promptForSelect(this.currentPlayer, properties);
    }

    getPromptForSelectProperties(player) {
        let properties = {
            buttons: this.choices.every((context) => context.ability.optional)
                ? [{ text: 'Done', arg: 'done' }]
                : [],
            location: 'any',
            onMenuCommand: (player, arg) => {
                if (arg === 'done') {
                    this.pressedDone = true;
                    return true;
                }
            }
        };
        return Object.assign(properties, this.getPromptProperties(player));
    }

    getPromptProperties(player) {
        const triggeringEvents = this.events.filter((e) =>
            this.choices.map((c) => c.event.name).includes(e.name)
        );
        return {
            source: 'Triggered Abilities',
            controls: this.getPromptControls(triggeringEvents),
            activePromptTitle: TriggeredAbilityWindowTitles.getTitle(
                this.abilityType,
                triggeringEvents,
                player
            ),
            waitingPromptTitle: 'Waiting for opponent'
        };
    }

    getPromptControls(triggeringEvents) {
        let map = new Map();
        for (let event of triggeringEvents) {
            let src = event.damageSource || (event.context && event.context.source);

            if (event.context && src) {
                let targets = map.get(event.context.source) || [];
                if (event.context.target) {
                    targets = targets.concat(event.context.target);
                } else if (event.card && event.card !== event.context.source) {
                    targets = targets.concat(event.card);
                } else if (event.context.event && event.context.event.card) {
                    targets = targets.concat(event.context.event.card);
                } else if (event.card) {
                    targets = targets.concat(event.card);
                }

                map.set(src, _.uniq(targets));
            }
        }

        return [...map.entries()].map(([source, targets]) => ({
            type: 'targeting',
            source: source.getShortSummary(),
            targets: targets.map((target) => target.getShortSummary())
        }));
    }

    promptBetweenAbilities(choices, addBackButton = true) {
        const getSourceName = (context) => {
            if (context.ability.title) {
                return context.ability.title;
            }

            if (context.ability.printedAbility) {
                return context.source.name;
            }

            const generatingEffect = this.game.effectEngine.effects.find(
                (effect) => effect.effect.getValue(context.source) === context.ability
            );
            if (generatingEffect) {
                return generatingEffect.source.name;
            }

            return context.source.name;
        };

        let menuChoices = _.uniq(choices.map((context) => getSourceName(context)));
        if (menuChoices.length === 1) {
            // this card has only one ability which can be triggered
            this.promptBetweenEventCards(choices, addBackButton);
            return;
        }

        // This card has multiple abilities which can be used in this window - prompt the player to pick one
        let handlers = menuChoices.map((name) => () =>
            this.promptBetweenEventCards(
                choices.filter((context) => getSourceName(context) === name)
            )
        );
        if (addBackButton) {
            menuChoices.push('Back');
            handlers.push(() => this.promptBetweenSources(this.choices));
        }

        const player = choices[0].player || this.currentPlayer;

        this.game.promptWithHandlerMenu(
            player,
            _.extend(this.getPromptProperties(player), {
                activePromptTitle: 'Choose an ability to use',
                choices: menuChoices,
                handlers: handlers
            })
        );
    }

    promptBetweenEventCards(choices, addBackButton = true) {
        // The events which this ability can respond to only affect a single card
        if (_.uniq(choices, (context) => context.event.card).length === 1) {
            this.promptBetweenEvents(choices, addBackButton);
            return;
        }

        // The events which this ability can respond to only affect cards where effects don't matter i.e. destroyed
        if (choices.every((context) => !EffectLocations.includes(context.event.card.location))) {
            this.promptBetweenEvents([choices[0]], addBackButton);
            return;
        }

        // Several cards could be affected by this ability - prompt the player to choose which they want to affect
        // e.g. particle shield can protect
        this.game.promptForSelect(
            this.currentPlayer,
            _.extend(this.getPromptForSelectProperties(this.currentPlayer), {
                activePromptTitle: 'Select a card to affect',
                cardCondition: (card) => _.any(choices, (context) => context.event.card === card),
                buttons: addBackButton ? [{ text: 'Back', arg: 'back' }] : [],
                onSelect: (player, card) => {
                    this.promptBetweenEvents(
                        choices.filter((context) => context.event.card === card)
                    );
                    return true;
                },
                onMenuCommand: (player, arg) => {
                    if (arg === 'back') {
                        this.promptBetweenSources(this.choices);
                        return true;
                    }
                }
            })
        );
    }

    promptBetweenEvents(choices, addBackButton = true) {
        choices = _.uniq(choices, (context) => context.event);
        if (choices.length === 1) {
            // This card is only being affected by a single event which the chosen ability can respond to
            this.resolveAbility(choices[0]);
            return;
        }

        // Ashes abilities don't respond to more than one event.
        //  COMMENTING this out while working on the prompt messaging (getPromptProperties)
        // -------------------------------------------------------
        // Several events affect this card and the chosen ability can respond to more than one of them - prompt player to pick one
        // let menuChoices = choices.map((context) =>
        //     TriggeredAbilityWindowTitles.getAction(context.event)
        // );
        // let handlers = choices.map((context) => () => this.resolveAbility(context));
        // if (addBackButton) {
        //     menuChoices.push('Back');
        //     handlers.push(() => this.promptBetweenSources(this.choices));
        // }

        // this.game.promptWithHandlerMenu(
        //     this.currentPlayer,
        //     _.extend(this.getPromptProperties(), {
        //         activePromptTitle: 'Choose an event to respond to',
        //         choices: menuChoices,
        //         handlers: handlers
        //     })
        // );
    }

    resolveAbility(context) {
        this.game.resolveAbility(context);
        if (context.ability.isLastingAbilityTrigger) {
            context.ability.hasTriggered = true;
        }
        this.resolvedAbilities.push({ ability: context.ability, event: context.event });
    }

    emitEvents() {
        this.choices = [];
        let events = this.eventWindow.event.getSimultaneousEvents();

        this.events = _.difference(events, this.eventsToExclude);
        _.each(this.events, (event) => {
            this.game.emit(event.name + ':' + this.abilityType, event, this);
        });
    }
}

module.exports = ForcedTriggeredAbilityWindow;
