import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import stripe from 'stripe';
import Product from './collection/Product.js';
import Order from './collection/Order.js';


dotenv.config();

// Initialize express app
const app = express();

// Serve static files from 'public' folder
app.use(express.static('public'));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Stripe Setup
const stripeGateway = stripe(process.env.STRIPE_API_KEY);
const DOMAIN = process.env.DOMAIN;

// Define schemas
const productSchema = new mongoose.Schema({
    title: String,
    price: Number,
    productImg: String,
    description: String,
});

const orderSchema = new mongoose.Schema({
    items: Array, // Store items as an array
    totalAmount: Number,
    orderDate: { type: Date, default: Date.now },
});

// // Create collections
// const Product = mongoose.collection('Product', productSchema);
// const Order = mongoose.collection('Order', orderSchema);

// Home Route
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

// Success Route
app.get('/success', (req, res) => {
    res.sendFile('success.html', { root: 'public' });
});

// Cancel Route
app.get('/cancel', (req, res) => {
    res.sendFile('cancel.html', { root: 'public' });
});

// Add Product API
app.post('/api/products', async (req, res) => {
    try {
        const { title, price, productImg, description } = req.body;
        const newProduct = new Product({ title, price, productImg, description });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Create Order API
app.post('/api/orders', async (req, res) => {
    try {
        const { items, totalAmount } = req.body;
        const newOrder = new Order({ items, totalAmount });
        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Stripe Checkout Route
app.post('/stripe-checkout', async (req, res) => {
    const lineItems = req.body.items.map((item) => {
        const unitAmount = parseInt(item.price.replace(/[^0-9.-]+/g, "") * 100);

        return {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title,
                    images: [item.productImg],
                },
                unit_amount: unitAmount,
            },
            quantity: item.quantity,
        };
    });

    try {
        // Create Checkout Session
        const session = await stripeGateway.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            success_url: `${DOMAIN}/success`,
            cancel_url: `${DOMAIN}/cancel`,
            line_items: lineItems,
            billing_address_collection: 'required',
        });

        // Create order in the database
        const totalAmount = lineItems.reduce((acc, item) => acc + (item.price_data.unit_amount * item.quantity), 0) / 100; // total amount in dollars
        await new Order({ items: req.body.items, totalAmount }).save();

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating Stripe session:', error);
        res.status(500).send('Something went wrong with the payment.');
    }
});

// Start server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
