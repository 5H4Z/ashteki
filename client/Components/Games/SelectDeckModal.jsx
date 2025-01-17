import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'react-bootstrap';
import igcircle from '../../assets/img/igcircle.png';
import DeckList from '../Decks/DeckList.jsx';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './SelectDeckModal.scss';

const SelectDeckModal = ({ onClose, onDeckSelected, onChooseForMe }) => {
    const { t } = useTranslation();

    return (
        <>
            <Modal show={true} onHide={onClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('Select Deck')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>
                        <Tabs>
                            <TabList>
                                <Tab>My Decks</Tab>
                                <Tab>Pre-cons</Tab>
                                <Tab>Building Basics</Tab>
                                <Tab style={{ backgroundColor: 'skyblue', color: '#333' }}>
                                    <img
                                        src={igcircle}
                                        alt='Adventuring Party'
                                        height='22'
                                        width='22'
                                    />{' '}Adventuring Party
                                </Tab>
                            </TabList>

                            <TabPanel>
                                <Button onClick={() => onChooseForMe(0)}>
                                    Choose for me
                                </Button>
                                <DeckList onDeckSelected={onDeckSelected} />
                            </TabPanel>
                            <TabPanel>
                                <Button onClick={() => onChooseForMe(1)}>
                                    Choose for me
                                </Button>
                                <DeckList standaloneDecks={1} onDeckSelected={onDeckSelected} />
                            </TabPanel>
                            <TabPanel>
                                <Button onClick={() => onChooseForMe(3)}>
                                    Choose for me
                                </Button>
                                <DeckList standaloneDecks={3} onDeckSelected={onDeckSelected} />
                            </TabPanel>
                            <TabPanel>
                                <Button onClick={() => onChooseForMe(2)}>
                                    Choose for me
                                </Button>
                                <DeckList standaloneDecks={2} onDeckSelected={onDeckSelected} />
                            </TabPanel>
                        </Tabs>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
};

SelectDeckModal.displayName = 'SelectDeckModal';

export default SelectDeckModal;
