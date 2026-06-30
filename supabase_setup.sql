
-- 1. Create Profiles Table (Linked to Supabase Auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create a Trigger to automatically insert a profile row when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, avatar_url)
    VALUES (
        new.id,
        coalesce(new.raw_user_meta_data->>'first_name', ''),
        coalesce(new.raw_user_meta_data->>'last_name', ''),
        'images/author.jpg' -- default avatar
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Create Books Table
CREATE TABLE IF NOT EXISTS public.books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    isbn13 TEXT UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    image TEXT NOT NULL,
    url TEXT,
    authors TEXT NOT NULL,
    publisher TEXT,
    publisher_year TEXT,
    stock INTEGER DEFAULT 0 NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 0.0 NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Books
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to books" 
    ON public.books FOR SELECT 
    USING (true);


-- 3. Create Wishlists Table (Join table for User <-> Books)
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    book_id INTEGER REFERENCES public.books ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, book_id)
);

-- Enable RLS on Wishlists
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own wishlist items" 
    ON public.wishlists 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 4. Create Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    book_id INTEGER REFERENCES public.books ON DELETE CASCADE NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, book_id)
);

-- Enable RLS on Cart Items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own cart items" 
    ON public.cart_items 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 5. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own orders" 
    ON public.orders FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own orders" 
    ON public.orders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- 6. Create Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    book_id INTEGER REFERENCES public.books ON DELETE CASCADE NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL
);

-- Enable RLS on Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own order items" 
    ON public.order_items FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to insert order items" 
    ON public.order_items FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
        )
    );


-- 7. Seed Books Data
INSERT INTO public.books (title, subtitle, isbn13, price, image, url, authors, publisher, publisher_year, stock, rating, category)
VALUES
('Snowflake: The Definitive Guide', 'Architecting, Designing, and Deploying on the Snowflake Data Cloud', '9781098103828', 58.90, 'images/book-2.webp', 'https://itbook.store/books/9781098103828', 'Joy Mundy, Joyce Kay Avila, Robert Dempsey', 'O''Reilly Media, Inc.', '2024', 20, 5.0, 'Database'),
('Python for Data Analysis, 3rd Edition', 'Data Wrangling with pandas, NumPy, and Jupyter', '9781098104030', 34.96, 'images/book-3.webp', 'https://itbook.store/books/9781098104030', 'Wes McKinney', 'O''Reilly Media, Inc.', '2024', 45, 2.0, 'Python'),
('Reliable Machine Learning', 'Applying SRE Principles to ML in Production', '9781098106225', 43.99, 'images/book-4.webp', 'https://itbook.store/books/9781098106225', 'Tariq Rashid', 'O''Reilly Media, Inc.', '2024', 20, 4.6, 'Machine Learning'),
('Data Visualization with Python and JavaScript, 2nd Edition', 'Scrape, Clean, Explore, and Transform Your Data', '9781098111878', 60.99, 'images/book-5.webp', 'https://itbook.store/books/9781098111878', 'Kyran Dale', 'O''Reilly Media, Inc.', '2024', 18, 4.7, 'Python'),
('Learning Microsoft Power BI', 'Transforming Data into Insights', '9781098112844', 40.97, 'images/book-6.webp', 'https://itbook.store/books/9781098112844', 'Reza Rad', 'O''Reilly Media, Inc.', '2024', 90, 4.5, 'Programming'),
('C++ Software Design', 'Design Principles and Patterns for High-Quality Software', '9781098113162', 48.99, 'images/book-7.webp', 'https://itbook.store/books/9781098113162', 'Klaus Iglberger', 'O''Reilly Media, Inc.', '2024', 100, 4.6, 'C/C++'),
('Terraform: Up and Running, 3rd Edition', 'Writing Infrastructure as Code', '9781098116743', 41.99, 'images/book-2.webp', 'https://itbook.store/books/9781098116743', 'Yevgeniy Brikman', 'O''Reilly Media, Inc.', '2024', 0, 4.8, 'Programming'),
('Flutter and Dart Cookbook', 'Developing Full-Stack Applications for the Cloud', '9781098119515', 42.99, 'images/book-9.webp', 'https://itbook.store/books/9781098119515', 'Richard Rose, Vinod G. Ashok', 'O''Reilly Media, Inc.', '2024', 25, 4.7, 'Programming'),
('Python Data Science Handbook, 2nd Edition', 'Essential Tools for Working with Data', '9781098121228', 56.99, 'images/book-10.webp', 'https://itbook.store/books/9781098121228', 'Jake VanderPlas', 'O''Reilly Media, Inc.', '2024', 30, 4.9, 'Python'),
('Raspberry Pi Cookbook, 4th Edition', 'Software and Hardware Problems and Solutions', '9781098130923', 14.99, 'images/book-11.webp', 'https://itbook.store/books/9781098130923', 'Simon Monk', 'O''Reilly Media, Inc.', '2024', 50, 4.5, 'Programming'),
('Azure Maps Using Blazor Succinctly', '', '9781642002263', 0.00, 'images/book-10.webp', 'https://itbook.store/books/9781642002263', 'Daniel Roth', 'Syncfusion Inc.', '2024', 20, 4.4, 'Programming'),
('Full Stack Quarkus and React', 'Hands-on full stack web development with Java, React, and Kubernetes', '9781800562738', 39.99, 'images/book-3.webp', 'https://itbook.store/books/9781800562738', 'Prashant Padmanabhan', 'Packt Publishing', '2024', 20, 4.3, 'Programming'),
('Mathematics for Game Programming and Computer Graphics', 'Explore the essential mathematics for creating, rendering, and manipulating 3D virtual environments', '9781801077330', 49.99, 'images/book-4.webp', 'https://itbook.store/books/9781801077330', 'John P. Doran', 'Packt Publishing', '2024', 30, 4.6, 'Programming'),
('Architecting and Building High-Speed SoCs', 'Design, develop, and debug complex FPGA-based systems-on-chip', '9781801810999', 35.99, 'images/book-5.webp', 'https://itbook.store/books/9781801810999', 'Clive Maxfield', 'Packt Publishing', '2024', 20, 4.2, 'Programming'),
('Web Development with Julia and Genie', 'A hands-on guide to high-performance server-side web development with the Julia programming language', '9781801811132', 39.99, 'images/book-6.webp', 'https://itbook.store/books/9781801811132', 'Avik Sengupta', 'Packt Publishing', '2024', 15, 4.4, 'Web Development'),
('Java Memory Management', 'A comprehensive guide to garbage collection and JVM tuning', '9781801812856', 34.99, 'images/book-7.webp', 'https://itbook.store/books/9781801812856', 'Suhas S. Kadam', 'Packt Publishing', '2024', 40, 4.5, 'Programming'),
('Test-Driven Development with C++', 'A simple guide to writing bug-free Agile code', '9781803242002', 44.99, 'images/book-10.webp', 'https://itbook.store/books/9781803242002', 'Viktor Sehr, Arne Mertz', 'Packt Publishing', '2024', 25, 4.7, 'C/C++'),
('Software Test Design', 'Write comprehensive test plans to uncover critical bugs in web, desktop, and mobile apps', '9781804612569', 44.99, 'images/book-9.webp', 'https://itbook.store/books/9781804612569', 'Paul C. Jorgensen', 'Packt Publishing', '2024', 10, 4.3, 'Programming'),
('Microservices with Go', 'Building scalable and reliable microservices with Go', '9781804617007', 29.99, 'images/book-20.webp', 'https://itbook.store/books/9781804617007', 'Nic Jackson', 'Packt Publishing', '2024', 50, 4.6, 'Programming')
ON CONFLICT (isbn13) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    price = EXCLUDED.price,
    image = EXCLUDED.image,
    url = EXCLUDED.url,
    authors = EXCLUDED.authors,
    publisher = EXCLUDED.publisher,
    publisher_year = EXCLUDED.publisher_year,
    stock = EXCLUDED.stock,
    rating = EXCLUDED.rating,
    category = EXCLUDED.category;
