from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Sum, Count
from .models import (
    User, Category, Brand, Product, ProductImage, ProductVariant,
    Review, County, PickupStation, Cart, CartItem,
    Order, OrderItem, MpesaTransaction, Wishlist, Banner
)


# ══════════════════════════════════════════════════════════════════════════════
# SITE CUSTOMISATION
# ══════════════════════════════════════════════════════════════════════════════

admin.site.site_header  = "🛒 Kilimall Admin"
admin.site.site_title   = "Kilimall"
admin.site.index_title  = "Dashboard"


# ══════════════════════════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ("email", "username", "full_name", "phone", "is_staff", "is_active", "created_at")
    list_filter   = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", "username", "first_name", "last_name", "phone")
    ordering      = ("-created_at",)
    readonly_fields = ("created_at",)

    fieldsets = (
        (None,            {"fields": ("email", "username", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "phone", "avatar")}),
        ("Permissions",   {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates",         {"fields": ("last_login", "date_joined", "created_at")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields":  ("email", "username", "password1", "password2", "first_name", "last_name", "phone"),
        }),
    )

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or "—"
    full_name.short_description = "Name"


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ("name", "slug", "parent", "icon_preview", "product_count", "is_active")
    list_filter   = ("is_active", "parent")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ("is_active",)
    ordering      = ("name",)

    def icon_preview(self, obj):
        if obj.icon:
            return format_html('<i class="{}"></i> <code>{}</code>', obj.icon, obj.icon)
        return "—"
    icon_preview.short_description = "Icon"

    def product_count(self, obj):
        count = obj.products.filter(is_active=True).count()
        return format_html('<b style="color:#f85606">{}</b>', count)
    product_count.short_description = "Products"


# ══════════════════════════════════════════════════════════════════════════════
# BRAND
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display  = ("name", "slug", "logo_preview", "product_count", "is_active")
    list_filter   = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ("is_active",)

    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" style="height:32px;object-fit:contain;" />', obj.logo.url)
        return "—"
    logo_preview.short_description = "Logo"

    def product_count(self, obj):
        return obj.products.filter(is_active=True).count()
    product_count.short_description = "Products"


# ══════════════════════════════════════════════════════════════════════════════
# PRODUCT
# ══════════════════════════════════════════════════════════════════════════════

class ProductImageInline(admin.TabularInline):
    model   = ProductImage
    extra   = 1
    fields  = ("image", "image_preview", "alt_text", "is_primary", "order")
    readonly_fields = ("image_preview",)

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:60px;object-fit:contain;" />', obj.image.url)
        return "—"
    image_preview.short_description = "Preview"


class ProductVariantInline(admin.TabularInline):
    model  = ProductVariant
    extra  = 1
    fields = ("name", "value", "price_adjustment", "stock")


class ReviewInline(admin.TabularInline):
    model     = Review
    extra     = 0
    fields    = ("user", "rating", "comment", "created_at")
    readonly_fields = ("created_at",)
    can_delete = True


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "thumbnail", "name", "category", "brand",
        "price_display", "stock_display", "rating_display",
        "is_featured", "is_flash_deal", "is_active", "views",
    )
    list_filter  = ("is_active", "is_featured", "is_flash_deal", "category", "brand")
    search_fields = ("name", "slug", "sku", "description")
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ("is_featured", "is_flash_deal", "is_active")
    readonly_fields = ("id", "sku", "views", "rating", "review_count", "created_at", "updated_at", "discount_badge")
    ordering  = ("-created_at",)
    date_hierarchy = "created_at"
    inlines   = [ProductImageInline, ProductVariantInline, ReviewInline]
    save_on_top = True

    fieldsets = (
        ("Basic Info", {
            "fields": ("id", "name", "slug", "sku", "category", "brand", "short_description", "description")
        }),
        ("Pricing & Stock", {
            "fields": ("price", "original_price", "discount_badge", "stock")
        }),
        ("Visibility & Deals", {
            "fields": ("is_active", "is_featured", "is_flash_deal", "flash_deal_end")
        }),
        ("Stats (read-only)", {
            "fields": ("rating", "review_count", "views", "created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def thumbnail(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img:
            return format_html('<img src="{}" style="height:48px;width:48px;object-fit:contain;border:1px solid #eee;border-radius:3px;" />', img.image.url)
        return format_html('<div style="height:48px;width:48px;background:#f5f5f5;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#ccc;">N/A</div>')
    thumbnail.short_description = ""

    from django.utils.html import format_html
    from decimal import Decimal

    def price_display(self, obj):
        price = f"{int(obj.price):,}"
        
        if obj.original_price and obj.original_price > obj.price:
            original = f"{int(obj.original_price):,}"
            pct = obj.discount_percent

            return format_html(
                '<span style="color:#f85606;font-weight:700">KES {}</span>'
                '<br><small style="color:#aaa;text-decoration:line-through">KES {}</small>'
                '<br><span style="background:#ff4d4f;color:white;padding:1px 5px;border-radius:2px;font-size:11px">-{}%</span>',
                price,
                original,
                pct
            )

        return format_html(
            '<span style="color:#f85606;font-weight:700">KES {}</span>',
            price
        )
    price_display.short_description = "Price"
    price_display.admin_order_field = "price"

    def stock_display(self, obj):
        color = "#52c41a" if obj.stock > 10 else "#faad14" if obj.stock > 0 else "#ff4d4f"
        label = "In Stock" if obj.stock > 10 else "Low Stock" if obj.stock > 0 else "Out of Stock"
        return format_html(
            '<span style="color:{};font-weight:600">{}</span><br><small>{} units</small>',
            color, label, obj.stock
        )
    stock_display.short_description = "Stock"
    stock_display.admin_order_field = "stock"

    def rating_display(self, obj):
        stars = "★" * int(obj.rating) + "☆" * (5 - int(obj.rating))
        return format_html(
            '<span style="color:#ffc107">{}</span> <small style="color:#888">({} reviews)</small>',
            stars, obj.review_count
        )
    rating_display.short_description = "Rating"

    def discount_badge(self, obj):
        if obj.original_price and obj.original_price > obj.price:
            pct = obj.discount_percent
            return format_html(
                '<span style="background:#ff4d4f;color:white;padding:4px 10px;border-radius:3px;font-weight:700">-{}% OFF</span>',
                pct
            )
        return "No discount"
    discount_badge.short_description = "Discount"


# ══════════════════════════════════════════════════════════════════════════════
# REVIEW
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ("product", "user", "stars_display", "comment_preview", "created_at")
    list_filter   = ("rating",)
    search_fields = ("product__name", "user__email", "comment")
    readonly_fields = ("created_at",)
    ordering      = ("-created_at",)

    def stars_display(self, obj):
        stars = "★" * obj.rating + "☆" * (5 - obj.rating)
        return format_html('<span style="color:#ffc107;font-size:16px">{}</span>', stars)
    stars_display.short_description = "Rating"

    def comment_preview(self, obj):
        return obj.comment[:80] + "…" if len(obj.comment) > 80 else obj.comment
    comment_preview.short_description = "Comment"


# ══════════════════════════════════════════════════════════════════════════════
# DELIVERY
# ══════════════════════════════════════════════════════════════════════════════

class PickupStationInline(admin.TabularInline):
    model  = PickupStation
    extra  = 1
    fields = ("name", "address", "delivery_fee", "working_hours", "phone", "is_active")


@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display  = ("name", "code", "slug", "station_count")
    search_fields = ("name", "code")
    prepopulated_fields = {"slug": ("name",)}
    ordering      = ("name",)
    inlines       = [PickupStationInline]

    def station_count(self, obj):
        count = obj.stations.filter(is_active=True).count()
        return format_html('<b style="color:#f85606">{}</b> stations', count)
    station_count.short_description = "Active Stations"


@admin.register(PickupStation)
class PickupStationAdmin(admin.ModelAdmin):
    list_display  = ("name", "county", "address_short", "fee_display", "working_hours", "phone", "is_active")
    list_filter   = ("is_active", "county")
    search_fields = ("name", "address", "county__name")
    list_editable = ("is_active",)
    ordering      = ("county__name", "delivery_fee")

    def address_short(self, obj):
        return obj.address[:50] + "…" if len(obj.address) > 50 else obj.address
    address_short.short_description = "Address"

    def fee_display(self, obj):
        return format_html('<b style="color:#f85606">KES {:,}</b>', int(obj.delivery_fee))
    fee_display.short_description = "Delivery Fee"
    fee_display.admin_order_field = "delivery_fee"


# ══════════════════════════════════════════════════════════════════════════════
# CART
# ══════════════════════════════════════════════════════════════════════════════

class CartItemInline(admin.TabularInline):
    model  = CartItem
    extra  = 0
    fields = ("product", "variant", "quantity", "subtotal_display")
    readonly_fields = ("subtotal_display",)

    def subtotal_display(self, obj):
        return format_html("KES {:,}", int(obj.subtotal))
    subtotal_display.short_description = "Subtotal"


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display  = ("id", "owner", "item_count", "cart_total", "updated_at")
    search_fields = ("user__email", "session_key")
    readonly_fields = ("updated_at",)
    inlines = [CartItemInline]

    def owner(self, obj):
        return obj.user.email if obj.user else f"Guest ({obj.session_key[:10]}…)"
    owner.short_description = "Owner"

    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = "Items"

    def cart_total(self, obj):
        return format_html('<b style="color:#f85606">KES {:,}</b>', int(obj.get_total()))
    cart_total.short_description = "Total"


# ══════════════════════════════════════════════════════════════════════════════
# ORDER
# ══════════════════════════════════════════════════════════════════════════════

class OrderItemInline(admin.TabularInline):
    model  = OrderItem
    extra  = 0
    fields = ("product_name", "product_sku", "variant_name", "quantity", "unit_price", "subtotal")
    readonly_fields = ("product_name", "product_sku", "variant_name", "quantity", "unit_price", "subtotal")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class MpesaInline(admin.TabularInline):
    model  = MpesaTransaction
    extra  = 0
    fields = ("checkout_request_id", "phone_number", "amount", "status", "mpesa_receipt", "created_at")
    readonly_fields = ("checkout_request_id", "phone_number", "amount", "status", "mpesa_receipt", "created_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number", "customer_name", "customer_phone",
        "pickup_station", "status_badge", "payment_badge",
        "total_display", "created_at",
    )
    list_filter   = ("status", "payment_status", "pickup_station__county")
    search_fields = ("order_number", "customer_name", "customer_phone", "customer_email")
    readonly_fields = (
        "id", "order_number", "subtotal", "delivery_fee", "total",
        "created_at", "updated_at",
    )
    ordering      = ("-created_at",)
    date_hierarchy = "created_at"
    inlines       = [OrderItemInline, MpesaInline]
    save_on_top   = True

    fieldsets = (
        ("Order Info", {
            "fields": ("id", "order_number", "user", "status", "payment_status")
        }),
        ("Customer", {
            "fields": ("customer_name", "customer_phone", "customer_email", "notes")
        }),
        ("Delivery", {
            "fields": ("pickup_station",)
        }),
        ("Financials", {
            "fields": ("subtotal", "delivery_fee", "total")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    STATUS_COLORS = {
        "pending":    "#faad14",
        "confirmed":  "#52c41a",
        "processing": "#1890ff",
        "shipped":    "#2f54eb",
        "delivered":  "#389e0d",
        "cancelled":  "#ff4d4f",
        "refunded":   "#722ed1",
    }
    PAYMENT_COLORS = {
        "pending":  "#faad14",
        "paid":     "#52c41a",
        "failed":   "#ff4d4f",
        "refunded": "#722ed1",
    }

    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#888")
        return format_html(
            '<span style="background:{};color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    def payment_badge(self, obj):
        color = self.PAYMENT_COLORS.get(obj.payment_status, "#888")
        return format_html(
            '<span style="background:{};color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600">{}</span>',
            color, obj.get_payment_status_display()
        )
    payment_badge.short_description = "Payment"
    payment_badge.admin_order_field = "payment_status"

    def total_display(self, obj):
        return format_html('<b style="color:#f85606;font-size:14px">KES {:,}</b>', int(obj.total))
    total_display.short_description = "Total"
    total_display.admin_order_field = "total"

    # ── Actions ───────────────────────────────────────────────────────────────
    actions = ["mark_confirmed", "mark_processing", "mark_shipped", "mark_delivered", "mark_cancelled"]

    @admin.action(description="✔ Mark selected orders as Confirmed")
    def mark_confirmed(self, request, queryset):
        updated = queryset.update(status="confirmed")
        self.message_user(request, f"{updated} order(s) marked as Confirmed.")

    @admin.action(description="⚙ Mark selected orders as Processing")
    def mark_processing(self, request, queryset):
        updated = queryset.update(status="processing")
        self.message_user(request, f"{updated} order(s) marked as Processing.")

    @admin.action(description="🚚 Mark selected orders as Shipped")
    def mark_shipped(self, request, queryset):
        updated = queryset.update(status="shipped")
        self.message_user(request, f"{updated} order(s) marked as Shipped.")

    @admin.action(description="📦 Mark selected orders as Delivered")
    def mark_delivered(self, request, queryset):
        updated = queryset.update(status="delivered", payment_status="paid")
        self.message_user(request, f"{updated} order(s) marked as Delivered.")

    @admin.action(description="✘ Mark selected orders as Cancelled")
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(status="cancelled")
        self.message_user(request, f"{updated} order(s) marked as Cancelled.")


# ══════════════════════════════════════════════════════════════════════════════
# M-PESA TRANSACTION
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display  = (
        "checkout_request_id_short", "order", "phone_number",
        "amount_display", "status_badge", "mpesa_receipt", "created_at",
    )
    list_filter   = ("status",)
    search_fields = ("checkout_request_id", "phone_number", "mpesa_receipt", "order__order_number")
    readonly_fields = (
        "checkout_request_id", "merchant_request_id", "amount", "phone_number",
        "result_code", "result_desc", "mpesa_receipt", "transaction_date",
        "created_at", "updated_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def checkout_request_id_short(self, obj):
        return obj.checkout_request_id[:30] + "…"
    checkout_request_id_short.short_description = "Checkout Request ID"

    def amount_display(self, obj):
        return format_html('<b style="color:#00a651">KES {:,}</b>', int(obj.amount))
    amount_display.short_description = "Amount"

    STATUS_COLORS = {
        "pending":   "#faad14",
        "success":   "#52c41a",
        "failed":    "#ff4d4f",
        "cancelled": "#888",
    }

    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#888")
        return format_html(
            '<span style="background:{};color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = "Status"

    def has_add_permission(self, request):
        return False


# ══════════════════════════════════════════════════════════════════════════════
# WISHLIST
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display  = ("user", "product", "added_at")
    search_fields = ("user__email", "product__name")
    readonly_fields = ("added_at",)
    ordering      = ("-added_at",)


# ══════════════════════════════════════════════════════════════════════════════
# BANNER
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display  = ("title", "subtitle", "image_preview", "link", "order", "is_active")
    list_editable = ("order", "is_active")
    ordering      = ("order",)

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:50px;width:120px;object-fit:cover;border-radius:3px;" />',
                obj.image.url
            )
        return "—"
    image_preview.short_description = "Preview"