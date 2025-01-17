import React, { useState, useEffect, useRef } from 'react';
import { Col, Form } from 'react-bootstrap';
import moment from 'moment';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import filterFactory, { textFilter } from 'react-bootstrap-table2-filter';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash.debounce';
import $ from 'jquery';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

import Phoenixborn from './Phoenixborn';
import {
    loadDecks,
    selectDeck,
    loadStandaloneDecks,
    loadAdventuringPartyDecks,
    loadBuildingBasicsDecks
} from '../../redux/actions';

import './DeckList.scss';

/**
 * @typedef CardLanguage
 * @property {string} name
 */

/**
 * @typedef Card
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} rarity
 * @property {string} number
 * @property {string} image
 * @property {number} status
 * @property {number} power
 * @property {number} expansion
 * @property {string} packCode
 * @property {string[]} keywords
 * @property {{[key: string]: CardLanguage}} locale
 */

/**
 * @typedef DeckCard
 * @property {number} count
 * @property {string} id
 * @property {Card} card
 */

/**
 * @typedef Deck
 * @property {number} id The database id of the deck
 * @property {string} name The name of the deck
 * @property {Date} lastUpdated The date the deck was last saved
 * @property {DeckCard[]} cards The cards in the deck along with how many of each card
 * @property {number} expansion The expansion number
 * @property {string} losses The number of losses this deck has had
 * @property {string} username The owner of this deck
 * @property {string} uuid The unique identifier of the deck
 * @property {number} wins The number of wins this deck has had
 * @property {number} winRate The win rate of the deck
 */

/**
 * @typedef DeckListProps
 * @property {Deck} [activeDeck] The currently selected deck
 * @property {boolean} [noFilter] Whether or not to enable filtering
 * @property {function(Deck): void} [onDeckSelected] Callback fired when a deck is selected
 * @property {boolean} [standaloneDecks] Only load the standalong decks rather than the user decks
 */

/**
 * @typedef PagingDetails
 * @property {number} page
 * @property {number} sizePerPage
 * @property {string} sortField
 * @property {string} sortOrder
 * @property {{ [key: string]: { filterVal: string; }; }} filters
 */

/**
 * @param {DeckListProps} props
 */
const DeckList = ({ onDeckSelected, standaloneDecks = 0 }) => {
    const { t } = useTranslation();
    const [pagingDetails, setPagingDetails] = useState({
        pageSize: 10,
        page: 1,
        sort: 'lastUpdated',
        sortDir: 'desc',
        filter: []
    });
    const nameFilter = useRef(null);
    const dispatch = useDispatch();

    const getDecks = (state) => {
        switch (standaloneDecks) {
            case 1:
                return state.cards.standaloneDecks;
            case 2:
                return state.cards.adventuringPartyDecks;
            case 3:
                return state.cards.buildingBasicsDecks;
            default:
                return state.cards.decks;
        }
    };

    const { decks, numDecks, selectedDeck } = useSelector((state) => ({
        decks: getDecks(state),
        numDecks: state.cards.numDecks,
        selectedDeck: standaloneDecks ? null : state.cards.selectedDeck
    }));

    useEffect(() => {
        if (standaloneDecks == 1) {
            dispatch(loadStandaloneDecks());
        } else if (standaloneDecks == 2) {
            dispatch(loadAdventuringPartyDecks());
        } else if (standaloneDecks == 3) {
            dispatch(loadBuildingBasicsDecks());
        } else {
            dispatch(loadDecks(pagingDetails));
        }

        $('.filter-label').parent().parent().hide();
    }, [pagingDetails, dispatch, standaloneDecks]);

    const selectRow = {
        mode: 'radio',
        clickToSelect: true,
        hideSelectColumn: true,
        selected: decks && selectedDeck ? [decks.find((d) => d._id === selectedDeck._id)?._id] : [],
        classes: 'selected-deck',
        onSelect: (deck, isSelect) => {
            if (isSelect) {
                dispatch(selectDeck(deck));
            }
        }
    };

    const rowEvents = {
        onClick: (event, deck) => {
            onDeckSelected && onDeckSelected(deck);
        }
    };

    // eslint-disable-next-line no-unused-vars
    const rowClasses = (row) => {
        if (!row.status.basicRules) {
            return 'invalid';
        }

        if (!row.status.hasConjurations) {
            return 'conjurations';
        }

        return '';
    };

    /**
     * @param {any} type
     * @param {PagingDetails} data
     */
    const onTableChange = (type, data) => {
        let newPageData = Object.assign({}, pagingDetails);
        switch (type) {
            case 'pagination':
                if (
                    (pagingDetails.page !== data.page && data.page !== 0) ||
                    (pagingDetails.pageSize !== data.sizePerPage && data.sizePerPage !== 0)
                ) {
                    newPageData.page = data.page || pagingDetails.page;
                    newPageData.pageSize = data.sizePerPage;
                }

                break;
            case 'sort':
                newPageData.sort = data.sortField;
                newPageData.sortDir = data.sortOrder;

                break;
            case 'filter':
                newPageData.filter = Object.keys(data.filters).map((k) => ({
                    name: k,
                    value: data.filters[k].filterVal
                }));

                break;
        }

        setPagingDetails(newPageData);
    };

    const columns = [
        {
            dataField: 'none',
            headerStyle: {
                width: '12%'
            },
            text: t('Id'),
            sort: false,
            // eslint-disable-next-line react/display-name
            formatter: (_, row) => (
                <div className='deck-image'>
                    <Phoenixborn pbStub={row.phoenixborn[0]?.card.imageStub} />
                </div>
            )
        },
        {
            dataField: 'name',
            text: t('Name'),
            sort: !standaloneDecks,
            style: {
                fontSize: '0.8rem'
            },
            filter: textFilter({
                getFilter: (filter) => {
                    nameFilter.current = filter;
                }
            }),
            formatter: (item, row) => {
                const hasChained = row.cards.some((c) => c.card.isChained);
                const icon = hasChained ? (
                    <FontAwesomeIcon icon={faLink} title='This deck contains chained cards' />
                ) : null;
                const output = (
                    <>
                        <span>{item}</span>&nbsp;
                        {icon}
                    </>
                );
                return output;
            }
        },
        {
            dataField: 'lastUpdated',
            headerStyle: {
                width: '20%'
            },
            style: {
                fontSize: '0.7rem'
            },
            align: 'center',
            text: t('Added'),
            sort: !standaloneDecks,
            /**
             * @param {Date} cell
             */
            formatter: (cell) => moment(cell).format('YYYY-MM-DD')
        },
        {
            dataField: 'winRate',
            align: 'center',
            text: t('Win %'),
            headerStyle: {
                width: '18%'
            },
            style: {
                fontSize: '0.8rem'
            },
            sort: !standaloneDecks,
            hidden: standaloneDecks,
            /**
             * @param {number} cell
             */
            formatter: (cell) => `${cell}%`
        }
    ];

    let onNameChange = debounce((event) => {
        nameFilter.current(event.target.value);
    }, 500);

    return (
        <div className='deck-list'>
            {!standaloneDecks && (
                <Col md={12}>
                    <Form>
                        <Form.Row>
                            <Form.Group as={Col} controlId='formGridName'>
                                <Form.Control
                                    name='name'
                                    type='text'
                                    onChange={(event) => {
                                        event.persist();
                                        onNameChange(event);
                                    }}
                                    placeholder={t('Filter by name')}
                                />
                            </Form.Group>
                        </Form.Row>
                    </Form>
                </Col>
            )}
            <Col md={12}>
                <BootstrapTable
                    bootstrap4
                    remote
                    hover
                    keyField='_id'
                    data={decks}
                    columns={columns}
                    selectRow={selectRow}
                    rowEvents={rowEvents}
                    rowClasses={rowClasses}
                    pagination={
                        standaloneDecks
                            ? null
                            : paginationFactory({
                                page: pagingDetails.page,
                                sizePerPage: pagingDetails.pageSize,
                                totalSize: numDecks
                            })
                    }
                    filter={filterFactory()}
                    filterPosition='top'
                    onTableChange={onTableChange}
                    defaultSorted={[{ dataField: 'datePublished', order: 'desc' }]}
                />
            </Col>
        </div>
    );
};

DeckList.displayName = 'DeckList';
export default DeckList;
