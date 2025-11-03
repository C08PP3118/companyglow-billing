-- Create profiles table to store additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  address TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their own companies"
  ON public.companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = user_id);

-- Create party type enum
CREATE TYPE public.party_type AS ENUM ('customer', 'supplier');

-- Create parties table (customers and suppliers)
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type public.party_type NOT NULL,
  address TEXT,
  mobile_number TEXT,
  opening_balance DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on parties
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- Parties policies
CREATE POLICY "Users can view their own parties"
  ON public.parties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own parties"
  ON public.parties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parties"
  ON public.parties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parties"
  ON public.parties FOR DELETE
  USING (auth.uid() = user_id);

-- Create items table for inventory
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  rate DECIMAL(12, 2) NOT NULL,
  opening_stock DECIMAL(12, 3) DEFAULT 0 NOT NULL,
  current_stock DECIMAL(12, 3) DEFAULT 0 NOT NULL,
  reorder_level DECIMAL(12, 3) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Users can view their own items"
  ON public.items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own items"
  ON public.items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
  ON public.items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
  ON public.items FOR DELETE
  USING (auth.uid() = user_id);

-- Create voucher type enum
CREATE TYPE public.voucher_type AS ENUM ('sales', 'purchase', 'receipt', 'payment');

-- Create vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  voucher_number TEXT NOT NULL,
  type public.voucher_type NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12, 2) NOT NULL,
  narration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(company_id, voucher_number)
);

-- Enable RLS on vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Vouchers policies
CREATE POLICY "Users can view their own vouchers"
  ON public.vouchers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vouchers"
  ON public.vouchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vouchers"
  ON public.vouchers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vouchers"
  ON public.vouchers FOR DELETE
  USING (auth.uid() = user_id);

-- Create voucher_items table (line items for sales and purchase vouchers)
CREATE TABLE public.voucher_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  rate DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on voucher_items
ALTER TABLE public.voucher_items ENABLE ROW LEVEL SECURITY;

-- Voucher items policies
CREATE POLICY "Users can view voucher items through vouchers"
  ON public.voucher_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vouchers
      WHERE vouchers.id = voucher_items.voucher_id
      AND vouchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create voucher items through vouchers"
  ON public.voucher_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vouchers
      WHERE vouchers.id = voucher_items.voucher_id
      AND vouchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update voucher items through vouchers"
  ON public.voucher_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.vouchers
      WHERE vouchers.id = voucher_items.voucher_id
      AND vouchers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete voucher items through vouchers"
  ON public.voucher_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.vouchers
      WHERE vouchers.id = voucher_items.voucher_id
      AND vouchers.user_id = auth.uid()
    )
  );

-- Create function to update item stock on voucher creation
CREATE OR REPLACE FUNCTION public.update_item_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT type FROM vouchers WHERE id = NEW.voucher_id) = 'sales' THEN
    -- Decrease stock for sales
    UPDATE items
    SET current_stock = current_stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF (SELECT type FROM vouchers WHERE id = NEW.voucher_id) = 'purchase' THEN
    -- Increase stock for purchase
    UPDATE items
    SET current_stock = current_stock + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to update stock when voucher items are inserted
CREATE TRIGGER update_stock_on_insert
  AFTER INSERT ON public.voucher_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_stock();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parties_updated_at
  BEFORE UPDATE ON public.parties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();