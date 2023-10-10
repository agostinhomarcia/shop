import axios from "axios";
import { GetStaticPaths, GetStaticProps } from "next";
import Image from "next/future/image";
import Head from "next/head";
import { useState } from "react";
import Stripe from "stripe";
import { stripe } from "../../lib/stripe";
import {
  ImageContainer,
  ProductContainer,
  ProductDetails,
} from "../../styles/pages/product";

import { useShoppingCart } from "use-shopping-cart";

interface ProductProps {
  product: {
    id: string;
    name: string;
    imageUrl: string;
    price: string;
    description: string;
    defaultPriceId: string;
  };
}

export default function Product({ product }: ProductProps) {
  const [quanty, setQuanty] = useState(0);
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  const [isCreatingCheckoutSession, setIsCreatingCheckoutSession] =
    useState(false);

  async function handleBuyButton() {
    try {
      setIsCreatingCheckoutSession(true);

      const response = await axios.post("/api/checkout", {
        priceId: product.defaultPriceId,
        quantity: quanty,
      });

      const { checkoutUrl } = response.data;

      window.location.href = checkoutUrl;
    } catch (err) {
      setIsCreatingCheckoutSession(false);

      alert("Falha ao redirecionar ao checkout!");
    }
  }
  function increaseQuantity() {
    setQuanty((prevState) => prevState + 1);
  }

  function decreaseQuantity() {
    setQuanty((prevState) => prevState - 1);
  }

  function addToCart() {
    if (quanty > 0) {
      const newItem = {
        id: product.id,
        product: product,
        quantity: quanty,
        total:
          quanty *
          parseFloat(product.price.replace("R$", "").replace(",", ".")),
      };

      setCart([...cart, newItem]);
      setCartTotal((prevTotal) => prevTotal + newItem.total);
      setQuanty(0);
    }
  }

  function modifyCartItem(productId, action) {
    const updatedCart = [...cart];
    const itemIndex = updatedCart.findIndex((item) => item.id === productId);

    if (itemIndex === -1) {
      return;
    }

    const item = updatedCart[itemIndex];

    if (action === "remove") {
      const removedItem = updatedCart.splice(itemIndex, 1)[0];
      setCartTotal((prevTotal) => prevTotal - removedItem.total);
    } else if (action === "decrease") {
      if (item.quantity > 1) {
        item.quantity -= 1;
        item.total -= parseFloat(
          product.price.replace("R$", "").replace(",", ".")
        );
        setCartTotal(
          (prevTotal) =>
            prevTotal -
            parseFloat(product.price.replace("R$", "").replace(",", "."))
        );
      }
    }

    setCart(updatedCart);
  }

  return (
    <>
      <Head>
        <title>{product.name} | Shop</title>
      </Head>

      <ProductContainer>
        <ImageContainer>
          <Image src={product.imageUrl} width={520} height={480} alt="" />
        </ImageContainer>

        <ProductDetails>
          <h1>{product.name}</h1>
          <span>{product.price}</span>

          <p>{product.description}</p>
          <span>{quanty}</span>
          <button onClick={increaseQuantity}>+</button>

          <button
            disabled={isCreatingCheckoutSession}
            onClick={handleBuyButton}
          >
            Comprar agora
          </button>
          <button onClick={addToCart} className="btn">
            Adicionar ao Carrinho
          </button>
          <div>
            Valor Total do Carrinho: R$ {cartTotal.toFixed(2)}{" "}
            {cart.map((item) => (
              <div key={item.id}>
                <p>Total: R$ {item.total.toFixed(2)}</p>
                <button onClick={decreaseQuantity}>-</button>
                <button onClick={() => modifyCartItem(item.id, "remove")}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        </ProductDetails>
      </ProductContainer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [{ params: { id: "prod_MLH5Wy0Y97hDAC" } }],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<any, { id: string }> = async ({
  params,
}) => {
  const productId = params.id;

  const product = await stripe.products.retrieve(productId, {
    expand: ["default_price"],
  });

  const price = product.default_price as Stripe.Price;

  return {
    props: {
      product: {
        id: product.id,
        name: product.name,
        imageUrl: product.images[0],
        price: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(price.unit_amount / 100),
        description: product.description,
        defaultPriceId: price.id,
      },
    },
    revalidate: 60 * 60 * 1, // 1 hours
  };
};
