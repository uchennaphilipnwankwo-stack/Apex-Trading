import React, { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';

const network = WalletAdapterNetwork.Mainnet;
const endpoint = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(endpoint);

const App = () => {
    const [wallet, setWallet] = useState(null);
    const [priceData, setPriceData] = useState(null);
    const [loading, setLoading] = useState(true);

    const wallets = [new PhantomWalletAdapter()];

    useEffect(() => {
        const fetchData = async () => {
            // Fetch live data for Solana price
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            setPriceData(data.solana.usd);
            setLoading(false);
        };

        fetchData();
    }, []);

    const connectWallet = async () => {
        if (wallet) {
            await wallet.connect();
        }
    };

    return (
        <ConnectionProvider connection={connection}>
            <WalletProvider wallets={wallets} onConnect={setWallet}>
                <div>
                    <h1>Solana Trading Dashboard</h1>
                    <button onClick={connectWallet}>Connect Wallet</button>
                    {loading ? <p>Loading...</p> : <p>Current Solana Price: ${priceData}</p>}
                    {/* TODO: Integrate price charts and AI Trade Agent modal */}
                </div>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;