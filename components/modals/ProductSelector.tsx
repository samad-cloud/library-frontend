'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ProductSelectorProps {
  selectedProducts: string[]
  onProductsChange: (products: string[]) => void
}

const productLibrary = ["photo mug", "photo book", "photo canvas", "metal print", "stone slate"]

export default function ProductSelector({ selectedProducts, onProductsChange }: ProductSelectorProps) {
  const [productInput, setProductInput] = useState("")
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)

  const addProduct = (product: string) => {
    if (selectedProducts.length < 3 && !selectedProducts.includes(product)) {
      onProductsChange([...selectedProducts, product])
    }
    setProductInput("")
    setShowProductSuggestions(false)
  }

  const removeProduct = (productToRemove: string) => {
    onProductsChange(selectedProducts.filter((p) => p !== productToRemove))
  }

  const getFilteredProducts = () => {
    return productLibrary.filter(
      (product) =>
        product.toLowerCase().includes(productInput.toLowerCase()) && !selectedProducts.includes(product)
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Products {selectedProducts.length > 0 && `(${selectedProducts.length}/3)`}
      </label>

      {/* Selected Products Tags */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedProducts.map((product) => (
            <div
              key={product}
              className="flex items-center gap-1 bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-sm"
            >
              <span>{product}</span>
              <button
                onClick={() => removeProduct(product)}
                className="hover:bg-pink-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Product Input with Autocomplete */}
      {selectedProducts.length < 3 && (
        <div className="relative">
          <input
            type="text"
            value={productInput}
            onChange={(e) => {
              setProductInput(e.target.value)
              setShowProductSuggestions(e.target.value.length > 0)
            }}
            onFocus={() => setShowProductSuggestions(productInput.length > 0)}
            onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Type to search products..."
          />

          {/* Autocomplete Suggestions */}
          {showProductSuggestions && getFilteredProducts().length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {getFilteredProducts().map((product) => (
                <button
                  key={product}
                  onClick={() => addProduct(product)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {product}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedProducts.length >= 3 && (
        <p className="text-xs text-gray-500 mt-1">Maximum 3 products selected</p>
      )}
    </div>
  )
}