# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_28_142950) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "boards", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "creator_nickname", null: false
    t.datetime "last_activity_at"
    t.integer "strokes_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["last_activity_at"], name: "index_boards_on_last_activity_at"
    t.index ["slug"], name: "index_boards_on_slug", unique: true
  end

  create_table "solid_cable_messages", force: :cascade do |t|
    t.binary "channel", null: false
    t.binary "payload", null: false
    t.datetime "created_at", null: false
    t.bigint "channel_hash", null: false
    t.index ["channel_hash"], name: "index_solid_cable_messages_on_channel_hash"
    t.index ["created_at"], name: "index_solid_cable_messages_on_created_at"
  end

  create_table "strokes", force: :cascade do |t|
    t.bigint "board_id", null: false
    t.string "tool", default: "pen", null: false
    t.string "color", default: "#111827", null: false
    t.float "width", default: 4.0, null: false
    t.jsonb "points", default: [], null: false
    t.string "nickname", null: false
    t.string "client_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["board_id", "created_at"], name: "index_strokes_on_board_id_and_created_at"
    t.index ["board_id"], name: "index_strokes_on_board_id"
    t.index ["client_id"], name: "index_strokes_on_client_id"
  end

  add_foreign_key "strokes", "boards"
end
